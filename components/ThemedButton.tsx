import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function ThemedButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: Props) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const baseStyle: ViewStyle = {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.6 : 1,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[baseStyle, { backgroundColor: theme.cor_primaria }, style]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        baseStyle,
        {
          backgroundColor: 'transparent',
          borderColor: theme.cor_primaria,
          borderWidth: 1.5,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.cor_primaria} />
      ) : (
        <Text
          className="text-base font-semibold"
          style={{ color: theme.cor_primaria }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
