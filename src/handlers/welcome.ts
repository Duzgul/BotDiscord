import { GuildMember, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { WELCOME_CONFIG } from '../config/welcome';

export async function handleWelcome(member: GuildMember) {
  if (member.user.bot) return;

  const guild = member.guild;
  const channel = guild.channels.cache.find(
    (c) => c.name === WELCOME_CONFIG.channelName && c.isTextBased()
  ) as TextChannel | undefined;

  if (!channel) {
    console.log(`Canal #${WELCOME_CONFIG.channelName} no encontrado, saltando bienvenida.`);
    return;
  }

  // Auto-assign Novato role
  const novatoRole = guild.roles.cache.find(
    (r) => r.name === '🆕 Novato' || r.name === 'Novato'
  );
  if (novatoRole) {
    try {
      await member.roles.add(novatoRole, 'Auto-asignación: nuevo miembro (Fortaleza Bot)');
      console.log(`Rol Novato asignado a ${member.user.tag}`);
    } catch (err) {
      console.error(`No se pudo asignar rol Novato a ${member.user.tag}:`, err);
    }
  }

  // Generate welcome image
  let attachment: AttachmentBuilder | undefined;
  try {
    const canvas = createCanvas(WELCOME_CONFIG.canvasWidth, WELCOME_CONFIG.canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, WELCOME_CONFIG.canvasWidth, 0);
    gradient.addColorStop(0, WELCOME_CONFIG.colors.background1);
    gradient.addColorStop(0.5, WELCOME_CONFIG.colors.background3);
    gradient.addColorStop(1, WELCOME_CONFIG.colors.background1);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WELCOME_CONFIG.canvasWidth, WELCOME_CONFIG.canvasHeight);

    // Gold accent lines
    ctx.fillStyle = WELCOME_CONFIG.colors.gold;
    ctx.fillRect(0, 0, WELCOME_CONFIG.canvasWidth, 4);
    ctx.fillRect(0, WELCOME_CONFIG.canvasHeight - 4, WELCOME_CONFIG.canvasWidth, 4);

    // Left gold vertical line
    ctx.fillRect(200, 20, 3, WELCOME_CONFIG.canvasHeight - 40);

    // Draw avatar
    let avatarDrawn = false;
    try {
      const avatarUrl = member.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar = await loadImage(avatarUrl);
      const avatarX = 100;
      const avatarY = WELCOME_CONFIG.canvasHeight / 2;
      const avatarRadius = 55;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        avatar,
        avatarX - avatarRadius,
        avatarY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
      ctx.restore();

      // Gold border around avatar
      ctx.strokeStyle = WELCOME_CONFIG.colors.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
      avatarDrawn = true;
    } catch (err) {
      console.error('No se pudo cargar el avatar para la imagen de bienvenida:', err);
    }

    // Welcome text
    const textX = 230;
    ctx.fillStyle = WELCOME_CONFIG.colors.gold;
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('¡BIENVENIDO/A!', textX, 80);

    // Username
    ctx.fillStyle = WELCOME_CONFIG.colors.white;
    ctx.font = 'bold 32px sans-serif';
    const displayName = member.displayName.length > 20
      ? member.displayName.substring(0, 17) + '...'
      : member.displayName;
    ctx.fillText(displayName, textX, 135);

    // Member count
    ctx.fillStyle = WELCOME_CONFIG.colors.gray;
    ctx.font = '22px sans-serif';
    ctx.fillText(`Miembro #${guild.memberCount}`, textX, 175);

    // Subtitle
    ctx.fillStyle = WELCOME_CONFIG.colors.gold;
    ctx.font = '20px sans-serif';
    ctx.fillText('La Fortaleza de Duzgul', textX, 220);

    // Small fortress emoji decoration
    if (avatarDrawn) {
      ctx.font = '24px sans-serif';
      ctx.fillText('🏰', 15, 30);
    }

    const buffer = canvas.toBuffer('image/png');
    attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
  } catch (err) {
    console.error('Error generando imagen de bienvenida:', err);
  }

  // Build embed
  const rolesChannel = guild.channels.cache.find(
    (c) => c.name === 'roles' || c.name === '🎭roles'
  );
  const rolesMention = rolesChannel ? `<#${rolesChannel.id}>` : '#roles';

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(WELCOME_CONFIG.messages.welcomeTitle)
    .setDescription(
      WELCOME_CONFIG.messages.welcomeDescription.replace('ROLES_CHANNEL', rolesMention)
    )
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(
      { name: '👤 Usuario', value: `<@${member.id}>`, inline: true },
      { name: '📊 Miembro #', value: `${guild.memberCount}`, inline: true }
    )
    .setFooter({ text: 'La Fortaleza de Duzgul', iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  try {
    if (attachment) {
      embed.setImage('attachment://welcome.png');
      await channel.send({ embeds: [embed], files: [attachment] });
    } else {
      await channel.send({ embeds: [embed] });
    }
    console.log(`Mensaje de bienvenida enviado para ${member.user.tag}`);
  } catch (err) {
    console.error('Error enviando mensaje de bienvenida:', err);
  }

  // Log
  await logToChannel(guild, `👋 **${member.user.tag}** se unió al servidor.`, 0x27ae60);
}

export async function logToChannel(
  guild: any,
  message: string,
  color: number
): Promise<void> {
  const logChannel = guild.channels.cache.find(
    (c: any) => c.name === 'logs' && c.type === 0
  );
  if (!logChannel) return;

  const embed = new EmbedBuilder().setColor(color).setDescription(message).setTimestamp();

  try {
    await (logChannel as TextChannel).send({ embeds: [embed] });
  } catch {
    // Silently fail if can't log
  }
}