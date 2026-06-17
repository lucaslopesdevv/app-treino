import { Image, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

type Props = {
  size?: 'sm' | 'md' | 'lg';
};

const DIMENSIONS: Record<NonNullable<Props['size']>, number> = {
  sm: 40,
  md: 80,
  lg: 120,
};

export function GymLogo({ size = 'md' }: Props) {
  const { logoUrl, gymNome, theme } = useTheme();
  const dim = DIMENSIONS[size];

  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: '#1e293b',
        }}
        resizeMode="cover"
      />
    );
  }

  const inicial = (gymNome ?? 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: theme.cor_primaria,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: dim * 0.45,
          fontWeight: '700',
        }}
      >
        {inicial}
      </Text>
    </View>
  );
}
