import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveUri } from '../lib/media';

/** Autoplays (muted, looping) the video on the top card of the swipe deck. */
export function VideoPreview({ id }: { id: string }) {
  const [source, setSource] = useState<{ id: string; uri: string } | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    resolveUri(id).then(
      (uri) => {
        if (!cancelled) setSource({ id, uri });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const uri = source?.id === id ? source.uri : null;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (!uri) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      <Pressable
        onPress={() => {
          const next = !muted;
          // expo-video players are native objects configured by assignment.
          // eslint-disable-next-line react-hooks/immutability
          player.muted = next;
          setMuted(next);
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute video' : 'Mute video'}
        style={styles.mute}
      >
        <Text style={styles.muteText}>{muted ? '🔇' : '🔊'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mute: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteText: { fontSize: 18 },
});
