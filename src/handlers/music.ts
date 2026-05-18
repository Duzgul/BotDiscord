import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ChannelType, TextChannel } from 'discord.js';
import ytdl from 'ytdl-core';
import {
  addToQueue,
  joinChannel,
  disconnectFromChannel,
  skipSong,
  pausePlayer,
  resumePlayer,
  getQueue,
  getCurrentSong,
  isPlaying,
  isPaused,
  setTextChannelId,
  getTextChannelId,
  formatDuration,
  Song,
} from '../utils/musicQueue';

function getMusicChannel(guild: ChatInputCommandInteraction['guild']): TextChannel | null {
  if (!guild) return null;
  return guild.channels.cache.find(
    (c) => c.name === 'música' && c.type === ChannelType.GuildText
  ) as TextChannel | null;
}

function createSongEmbed(song: Song, type: 'now' | 'queue' | 'added', position?: number): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(0x9b59b6);

  if (type === 'now') {
    embed.setTitle('🎵 Ahora suena');
    embed.setDescription(`**${song.title}**\n Duración: ${song.duration}`);
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    embed.setFooter({ text: `Solicitada por ${song.requester}`, iconURL: song.requesterAvatar ?? undefined });
  } else if (type === 'added') {
    embed.setTitle('✅ Canción añadida');
    embed.setDescription(`**${song.title}**\n Duración: ${song.duration}`);
    if (position !== undefined) {
      if (position <= 1) {
        embed.addFields({ name: 'Posición', value: 'Reproduciendo ahora', inline: true });
      } else {
        embed.addFields({ name: 'Posición en cola', value: `#${position}`, inline: true });
      }
    }
    embed.setFooter({ text: `Añadida por ${song.requester}`, iconURL: song.requesterAvatar ?? undefined });
  }

  return embed;
}

async function resolveSong(query: string, requester: string, requesterAvatar: string | null): Promise<Song | null> {
  try {
    let videoUrl = query;

    if (!ytdl.validateURL(query)) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      const html = await response.text();

      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (!match) return null;

      videoUrl = `https://www.youtube.com/watch?v=${match[1]}`;
    }

    const info = await ytdl.getInfo(videoUrl);
    const videoDetails = info.videoDetails;

    return {
      title: videoDetails.title,
      url: videoUrl,
      thumbnail: videoDetails.thumbnails?.[0]?.url ?? null,
      duration: formatDuration(parseInt(videoDetails.lengthSeconds) || 0),
      requester,
      requesterAvatar,
    };
  } catch (error) {
    console.error('Error al resolver canción:', error);
    return null;
  }
}

export async function handleMusicPlay(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  if (!member || !('voice' in member) || !member.voice.channel) {
    await interaction.reply({
      content: '🎙️ Debes estar en un canal de voz para usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const query = interaction.options.getString('canción', true);
  const guild = interaction.guild!;

  await interaction.deferReply();

  const song = await resolveSong(query, member.displayName, interaction.user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (!song) {
    await interaction.editReply('❌ No se pudo encontrar la canción. Intenta con otro nombre o URL.');
    return;
  }

  try {
    await joinChannel(guild, member.voice.channel);
  } catch (error) {
    console.error('Error al unirse al canal de voz:', error);
    await interaction.editReply('❌ No se pudo conectar al canal de voz. Asegúrate de que tengo permisos para unirme.');
    return;
  }

  const musicChannel = getMusicChannel(guild);
  if (musicChannel) {
    setTextChannelId(guild.id, musicChannel.id);
  } else if (interaction.channel) {
    setTextChannelId(guild.id, interaction.channel.id);
  }

  const result = addToQueue(guild.id, song);

  const embed = createSongEmbed(song, 'added', result.position);
  await interaction.editReply({ embeds: [embed] });

  if (musicChannel && result.willPlayNow) {
    const nowEmbed = createSongEmbed(song, 'now');
    await musicChannel.send({ embeds: [nowEmbed] }).catch(() => {});
  }
}

export async function handleMusicStop(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const state = getQueue(guild.id);
  const current = getCurrentSong(guild.id);

  if (state.length === 0 && !current) {
    await interaction.reply({ content: '🎵 No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });
    return;
  }

  disconnectFromChannel(guild.id);
  await interaction.reply('⏹️ Música detenida y bot desconectado del canal de voz.');
}

export async function handleMusicSkip(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const skipped = skipSong(guild.id);

  if (!skipped) {
    await interaction.reply({ content: '🎵 No hay canción para saltar.', flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('⏭️ Canción saltada')
    .setDescription(`**${skipped.title}**`);

  await interaction.reply({ embeds: [embed] });

  const musicChannel = getMusicChannel(guild);
  const nextSong = getCurrentSong(guild.id);
  if (musicChannel && nextSong) {
    const nowEmbed = createSongEmbed(nextSong, 'now');
    await musicChannel.send({ embeds: [nowEmbed] }).catch(() => {});
  }
}

export async function handleMusicPause(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;

  if (isPaused(guild.id)) {
    await interaction.reply({ content: '🎵 La música ya está pausada.', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = pausePlayer(guild.id);
  if (success) {
    await interaction.reply('⏸️ Música pausada. Usa `/música reanudar` para continuar.');
  } else {
    await interaction.reply({ content: '🎵 No hay música reproduciéndose para pausar.', flags: MessageFlags.Ephemeral });
  }
}

export async function handleMusicResume(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;

  if (isPlaying(guild.id)) {
    await interaction.reply({ content: '🎵 La música ya se está reproduciendo.', flags: MessageFlags.Ephemeral });
    return;
  }

  const success = resumePlayer(guild.id);
  if (success) {
    await interaction.reply('▶️ Música reanudada.');
  } else {
    await interaction.reply({ content: '🎵 No hay música pausada para reanudar.', flags: MessageFlags.Ephemeral });
  }
}

export async function handleMusicQueue(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const queue = getQueue(guild.id);
  const current = getCurrentSong(guild.id);

  if (!current && queue.length === 0) {
    await interaction.reply({ content: '🎵 No hay canciones en la cola.', flags: MessageFlags.Ephemeral });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🎵 Cola de reproducción');

  if (current) {
    embed.addFields({
      name: '🎵 Reproduciendo ahora',
      value: `**${current.title}** (${current.duration}) — Pedido por ${current.requester}`,
      inline: false,
    });
  }

  if (queue.length > 0) {
    const queueLines = queue.slice(0, 10).map((song, i) => {
      return `\`${i + 1}.\` **${song.title}** (${song.duration}) — ${song.requester}`;
    });

    embed.addFields({
      name: `📝 En cola (${queue.length} canción${queue.length !== 1 ? 'es' : ''})`,
      value: queueLines.join('\n'),
      inline: false,
    });

    if (queue.length > 10) {
      embed.addFields({
        name: '\u200B',
        value: `... y ${queue.length - 10} más`,
        inline: false,
      });
    }
  } else {
    embed.addFields({
      name: '📝 En cola',
      value: 'No hay canciones en espera',
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}