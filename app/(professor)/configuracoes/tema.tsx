import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { THEMES, getThemeById, type Theme } from '../../../lib/themes';
import { GymLogo } from '../../../components/GymLogo';
import { ThemedButton } from '../../../components/ThemedButton';

const BUCKET = 'gym-assets';

function base64ToBytes(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function PersonalizarTema() {
  const { profile } = useAuth();
  const { theme, logoUrl, refreshTheme } = useTheme();

  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [removendoLogo, setRemovendoLogo] = useState(false);
  const [trocandoTema, setTrocandoTema] = useState<string | null>(null);
  const [preview, setPreview] = useState<Theme>(theme);

  const gymId = profile?.gym_id;

  async function escolherLogo() {
    if (!gymId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Libere o acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setEnviandoLogo(true);
    try {
      const bytes = base64ToBytes(result.assets[0].base64);
      const path = `${gymId}/logo.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Adiciona query param pra forçar refresh do cache da Image
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from('gyms')
        .update({ logo_url: url })
        .eq('id', gymId);
      if (dbErr) throw dbErr;
      await refreshTheme();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível enviar a logo.');
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function removerLogo() {
    if (!gymId || !logoUrl) return;
    setRemovendoLogo(true);
    try {
      await supabase.storage.from(BUCKET).remove([`${gymId}/logo.jpg`]);
      const { error: dbErr } = await supabase
        .from('gyms')
        .update({ logo_url: null })
        .eq('id', gymId);
      if (dbErr) throw dbErr;
      await refreshTheme();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível remover a logo.');
    } finally {
      setRemovendoLogo(false);
    }
  }

  async function trocarTema(t: Theme) {
    if (!gymId) return;
    setPreview(t);
    setTrocandoTema(t.id);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          tema: t.id,
          cor_primaria: t.cor_primaria,
          cor_secundaria: t.cor_secundaria,
        })
        .eq('id', gymId);
      if (error) throw error;
      await refreshTheme();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível trocar o tema.');
    } finally {
      setTrocandoTema(null);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ padding: 16, gap: 24 }}
    >
      <View className="items-center gap-3">
        <GymLogo size="lg" />
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={escolherLogo}
            disabled={enviandoLogo}
            className={`rounded-xl px-4 py-2 ${
              enviandoLogo ? 'opacity-60' : ''
            }`}
            style={{ backgroundColor: theme.cor_primaria }}
          >
            {enviandoLogo ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">
                {logoUrl ? 'Trocar logo' : 'Alterar logo'}
              </Text>
            )}
          </TouchableOpacity>

          {logoUrl && (
            <TouchableOpacity
              onPress={removerLogo}
              disabled={removendoLogo}
              className={`rounded-xl bg-slate-700 px-4 py-2 ${
                removendoLogo ? 'opacity-60' : ''
              }`}
            >
              {removendoLogo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Remover</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View>
        <Text className="mb-3 text-base font-semibold text-white">
          Escolha o tema da academia
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {THEMES.map((t) => {
            const ativo = (theme.id as string) === t.id;
            const carregando = trocandoTema === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => trocarTema(t)}
                onPressIn={() => setPreview(t)}
                disabled={!!trocandoTema}
                style={{
                  width: '47%',
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: '#1e293b',
                  borderWidth: 2,
                  borderColor: ativo ? t.cor_primaria : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: t.cor_primaria,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text className="text-base font-semibold text-white">
                    {t.emoji} {t.nome}
                  </Text>
                </View>
                {carregando ? (
                  <ActivityIndicator color="#fff" />
                ) : ativo ? (
                  <Text className="text-green-400">✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text className="mb-3 text-base font-semibold text-white">
          Pré-visualização
        </Text>
        <View
          className="gap-3 rounded-xl p-4"
          style={{ backgroundColor: '#1e293b' }}
        >
          <Text className="text-base font-semibold text-white">
            {getThemeById(preview.id).nome}
          </Text>
          <Text className="text-sm text-slate-300">
            Botões e destaques ficarão nessa cor.
          </Text>
          <TouchableOpacity
            disabled
            style={{
              backgroundColor: preview.cor_primaria,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text className="font-semibold text-white">Botão de exemplo</Text>
          </TouchableOpacity>
          <View
            style={{
              borderRadius: 8,
              height: 8,
              backgroundColor: '#334155',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: '65%',
                height: '100%',
                backgroundColor: preview.cor_primaria,
              }}
            />
          </View>
        </View>
      </View>

      <ThemedButton
        title="Concluído"
        variant="secondary"
        onPress={() => refreshTheme()}
      />
    </ScrollView>
  );
}
