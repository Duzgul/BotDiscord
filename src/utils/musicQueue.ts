import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel } from 'discord.js';
import ytdl from 'ytdl-core';

export interface Song {
  title: string;
  url: string;
  thumbnail: string | null;
  duration: string;
  requester: string;
  requesterAvatar: string | null;
}

export interface GuildMusicState {
  queue: Song[];
  player: AudioPlayer;
  connection: VoiceConnection | null;
  currentSong: Song | null;
  textChannelId: string | null;
}

const guildStates = new Map<string, GuildMusicState>();

export function getGuildMusicState(guildId: string): GuildMusicState {
  if (!guildStates.has(guildId)) {
    const player = createAudioPlayer();
    guildStates.set(guildId, {
      queue: [],
      player,
      connection: null,
      currentSong: null,
      textChannelId: null,
    });

    player.on(AudioPlayerStatus.Idle, () => {
      const state = guildStates.get(guildId);
      if (state) {
        state.currentSong = null;
        playNext(guildId);
      }
    });

    player.on('error', (error) => {
      console.error(`Error en reproductor de música (${guildId}):`, error.message);
      const state = guildStates.get(guildId);
      if (state) {
        state.currentSong = null;
        playNext(guildId);
      }
    });
  }
  return guildStates.get(guildId)!;
}

export function deleteGuildMusicState(guildId: string) {
  const state = guildStates.get(guildId);
  if (state) {
    state.player.stop();
    if (state.connection) {
      state.connection.destroy();
    }
    guildStates.delete(guildId);
  }
}

export async function joinChannel(guild: Guild, voiceChannel: VoiceBasedChannel): Promise<VoiceConnection> {
  const state = getGuildMusicState(guild.id);

  const existingConnection = getVoiceConnection(guild.id);
  if (existingConnection && existingConnection.state.status !== VoiceConnectionStatus.Destroyed) {
    if (existingConnection.joinConfig.channelId === voiceChannel.id) {
      state.connection = existingConnection;
      return existingConnection;
    }
    existingConnection.destroy();
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await entersState(connection, VoiceConnectionStatus.Signalling, 5_000);
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
    } catch {
      deleteGuildMusicState(guild.id);
    }
  });

  state.connection = connection;
  connection.subscribe(state.player);

  return connection;
}

export function disconnectFromChannel(guildId: string) {
  const state = guildStates.get(guildId);
  if (state) {
    state.player.stop();
    state.queue = [];
    state.currentSong = null;
    if (state.connection) {
      state.connection.destroy();
      state.connection = null;
    }
    guildStates.delete(guildId);
  }
}

async function playNext(guildId: string) {
  const state = guildStates.get(guildId);
  if (!state || state.queue.length === 0) {
    return;
  }

  const song = state.queue.shift()!;
  state.currentSong = song;

  try {
    const stream = ytdl(song.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
      dlChunkSize: 0,
    });

    const resource = createAudioResource(stream);

    state.player.play(resource);
  } catch (error) {
    console.error(`Error al reproducir ${song.url}:`, error);
    state.currentSong = null;
    playNext(guildId);
  }
}

export function addToQueue(guildId: string, song: Song): { song: Song; position: number; willPlayNow: boolean } {
  const state = getGuildMusicState(guildId);
  state.queue.push(song);
  const position = state.queue.length;
  const willPlayNow = !state.currentSong && state.player.state.status === AudioPlayerStatus.Idle;

  if (willPlayNow) {
    playNext(guildId);
  }

  return { song, position, willPlayNow };
}

export function getQueue(guildId: string): Song[] {
  return getGuildMusicState(guildId).queue;
}

export function getCurrentSong(guildId: string): Song | null {
  return getGuildMusicState(guildId).currentSong;
}

export function skipSong(guildId: string): Song | null {
  const state = getGuildMusicState(guildId);
  if (!state.currentSong && state.queue.length === 0) return null;

  const skipped = state.currentSong;
  state.player.stop();
  return skipped;
}

export function pausePlayer(guildId: string): boolean {
  const state = getGuildMusicState(guildId);
  if (state.player.state.status === AudioPlayerStatus.Playing) {
    state.player.pause();
    return true;
  }
  return false;
}

export function resumePlayer(guildId: string): boolean {
  const state = getGuildMusicState(guildId);
  if (state.player.state.status === AudioPlayerStatus.Paused) {
    state.player.unpause();
    return true;
  }
  return false;
}

export function isPlaying(guildId: string): boolean {
  const state = getGuildMusicState(guildId);
  return state.player.state.status === AudioPlayerStatus.Playing;
}

export function isPaused(guildId: string): boolean {
  const state = getGuildMusicState(guildId);
  return state.player.state.status === AudioPlayerStatus.Paused;
}

export function setTextChannelId(guildId: string, channelId: string) {
  getGuildMusicState(guildId).textChannelId = channelId;
}

export function getTextChannelId(guildId: string): string | null {
  return getGuildMusicState(guildId).textChannelId;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}