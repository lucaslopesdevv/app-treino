import { useState } from 'react';
import {
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  getMediaType,
  getYouTubeId,
  getYouTubeThumbnail,
  getYouTubeWatchUrl,
} from '../lib/media';

type Props = {
  mediaUrl: string | null | undefined;
  height?: number;
  /** Se false, conteúdo já vem expandido (sem botão de toque). */
  collapsible?: boolean;
};

export function ExerciseMedia({
  mediaUrl,
  height = 200,
  collapsible = true,
}: Props) {
  const type = getMediaType(mediaUrl);
  const [open, setOpen] = useState(!collapsible);
  const [embedError, setEmbedError] = useState(false);

  if (type === 'none') {
    return (
      <View
        className="items-center justify-center rounded-lg bg-slate-700"
        style={{ height, width: '100%' }}
      >
        <Text className="text-4xl">🏋️</Text>
        <Text className="mt-2 text-xs text-slate-400">
          Sem mídia disponível
        </Text>
      </View>
    );
  }

  if (type === 'image') {
    if (collapsible && !open) {
      return (
        <TouchableOpacity onPress={() => setOpen(true)} className="w-full">
          <Image
            source={{ uri: mediaUrl! }}
            style={{
              width: '100%',
              height,
              borderRadius: 8,
              backgroundColor: '#0f172a',
            }}
            resizeMode="contain"
          />
          <Text className="mt-1 text-center text-xs text-slate-400">
            Toque para ampliar
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        disabled={!collapsible}
        onPress={() => collapsible && setOpen(false)}
        className="w-full"
      >
        <Image
          source={{ uri: mediaUrl! }}
          style={{
            width: '100%',
            height,
            borderRadius: 8,
            backgroundColor: '#0f172a',
          }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  const videoId = getYouTubeId(mediaUrl!);
  if (!videoId) return null;

  if (collapsible && !open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} className="w-full">
        <View
          className="overflow-hidden rounded-lg bg-slate-900"
          style={{ width: '100%', height }}
        >
          <Image
            source={{ uri: getYouTubeThumbnail(videoId) }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <View
            className="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-black/60">
              <Text className="text-2xl text-white">▶️</Text>
            </View>
          </View>
        </View>
        <Text className="mt-1 text-center text-xs text-slate-400">
          Toque para expandir o vídeo
        </Text>
      </TouchableOpacity>
    );
  }

  if (embedError) {
    return (
      <View className="w-full">
        <View
          className="items-center justify-center rounded-lg bg-slate-800 p-4"
          style={{ width: '100%', height }}
        >
          <Text className="text-center text-slate-200">
            Este vídeo não permite reprodução dentro do app.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(getYouTubeWatchUrl(videoId))}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2"
          >
            <Text className="font-semibold text-white">Abrir no YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full">
      <View
        className="overflow-hidden rounded-lg bg-black"
        style={{ width: '100%', height }}
      >
        <YoutubePlayer
          height={height}
          videoId={videoId}
          onError={() => setEmbedError(true)}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          }}
        />
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL(getYouTubeWatchUrl(videoId))}
        className="mt-2 self-end"
      >
        <Text className="text-xs text-blue-400">
          Não tocou? Abrir no YouTube
        </Text>
      </TouchableOpacity>
    </View>
  );
}
