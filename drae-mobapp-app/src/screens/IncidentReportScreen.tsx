import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from '../../App';
import { useAppData } from '../context/AppDataContext';
import { submitIncidentReport } from '../services/supabaseService';
import { alertPermissionBlocked, confirmPermissionStep } from '../utils/permissionDialogs';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'IncidentReport'>;

const hazards = ['Landslide', 'Earthquake', 'Flood', 'Fire', 'Others'];

export default function IncidentReportScreen({ navigation, route }: Props) {
  const { profile, profileRecordId } = useAppData();
  const [hazard, setHazard] = useState(route.params?.prefillHazard ?? 'Landslide');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 150);
  const playerSource = useMemo(() => (audioUri ? { uri: audioUri } : null), [audioUri]);
  const player = useAudioPlayer(playerSource, { updateInterval: 150 });
  const playerStatus = useAudioPlayerStatus(player);

  const isRecording = recorderState.isRecording;
  const isPlayingAudio = playerStatus.playing;
  const audioPositionMillis = Math.round((playerStatus.currentTime ?? 0) * 1000);
  const audioDurationMillis = Math.max(1, Math.round((playerStatus.duration ?? 0) * 1000));

  const pickPhoto = async () => {
    const ok = await confirmPermissionStep(
      'Photo library',
      'DRAE needs access to your photos so you can attach images as evidence to hazard reports. Images are sent only when you submit the report. You can change this anytime in Settings.',
    );
    if (!ok) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertPermissionBlocked(
        'Photo access denied',
        'Allow Photos for DRAE in Settings to attach evidence pictures.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const ok = await confirmPermissionStep(
        'Microphone and playback',
        'DRAE uses the microphone to record optional voice notes with your report. Preview uses your device speaker so you can listen before sending. Audio is uploaded only when you submit. You can change microphone access in Settings.',
      );
      if (!ok) {
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        alertPermissionBlocked(
          'Microphone denied',
          'Allow the microphone for DRAE in Settings to record voice evidence.',
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      player.pause();
      await player.seekTo(0);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setAudioUri(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start recording';
      Alert.alert('Recording Failed', message);
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) {
      return;
    }
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      setAudioUri(status.url ?? recorder.uri ?? null);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to stop recording';
      Alert.alert('Recording Failed', message);
    }
  };

  const toggleAudioPreview = async () => {
    if (!audioUri) {
      return;
    }

    try {
      if (playerStatus.playing) {
        player.pause();
        return;
      }
      if (playerStatus.duration && playerStatus.currentTime >= playerStatus.duration - 0.25) {
        await player.seekTo(0);
      }
      player.play();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to play recording';
      Alert.alert('Playback Failed', message);
    }
  };

  const submitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Missing details', 'Please provide incident details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitIncidentReport({
        profileId: profileRecordId,
        reporterName: profile.fullName,
        reporterContact: profile.contactNumber,
        hazardType: hazard,
        locationText: location,
        description,
        photoUri,
        audioUri,
      });

      const assignNote = result.assignedStaffName
        ? `\n\nAssigned responder: ${result.assignedStaffName}.`
        : '';

      Alert.alert(
        'Report Submitted',
        `Thank you${profile.fullName ? `, ${profile.fullName}` : ''}. Your ${hazard.toLowerCase()} report has been sent to CDRRMO.${assignNote}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Submission Failed',
        `Unable to submit incident report to cloud.\n\n${message}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Incident Report</Text>
      <Text style={styles.subtitle}>
        Submit hazards with optional photo evidence.
      </Text>

      <Text style={styles.label}>Hazard Type</Text>
      <View style={styles.chipWrap}>
        {hazards.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, hazard === item && styles.chipActive]}
            onPress={() => setHazard(item)}
          >
            <Text style={[styles.chipText, hazard === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Incident Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Street / Barangay / Landmark"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Describe what happened, current danger, and number of affected people."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Photo Evidence</Text>
      <TouchableOpacity style={styles.attachButton} onPress={pickPhoto}>
        <Text style={styles.attachButtonText}>
          {photoUri ? 'Change Photo' : 'Attach Photo'}
        </Text>
      </TouchableOpacity>

      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

      <Text style={styles.label}>Voice Message</Text>
      <TouchableOpacity
        style={[styles.attachButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.attachButtonText}>
          {isRecording
            ? 'Stop Recording'
            : audioUri
              ? 'Re-record Voice Message'
              : 'Record Voice Message'}
        </Text>
      </TouchableOpacity>
      {audioUri ? (
        <View style={styles.audioPreviewRow}>
          <Text style={styles.audioMeta}>Voice message ready to upload.</Text>
          <View style={styles.playerCard}>
            <TouchableOpacity style={styles.playButton} onPress={toggleAudioPreview}>
              <Text style={styles.playButtonText}>{isPlayingAudio ? 'II' : '>'}</Text>
            </TouchableOpacity>
            <View style={styles.sliderWrap}>
              <Slider
                minimumValue={0}
                maximumValue={audioDurationMillis}
                value={audioPositionMillis}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor="#C9D8CF"
                thumbTintColor={colors.primaryDark}
                onSlidingComplete={async (value) => {
                  try {
                    await player.seekTo(value / 1000);
                  } catch {
                    // Ignore seek errors to keep the player stable.
                  }
                }}
              />
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatMillis(audioPositionMillis)}</Text>
                <Text style={styles.timeText}>{formatMillis(audioDurationMillis)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.audioActionsRow}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={async () => {
                player.pause();
                await player.seekTo(0);
                setAudioUri(null);
              }}
            >
              <Text style={styles.deleteButtonText}>Delete Recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={submitReport}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatMillis(value: number) {
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  attachButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FFFB',
  },
  recordingButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#C94747',
  },
  attachButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  audioMeta: {
    marginTop: 8,
    color: colors.primaryDark,
    fontSize: 13,
  },
  audioPreviewRow: {
    marginTop: 8,
    gap: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  audioActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF6EE',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
  },
  sliderWrap: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  timeText: {
    color: colors.muted,
    fontSize: 11,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#C94747',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#9C2E2E',
    fontWeight: '700',
    fontSize: 13,
  },
  preview: {
    marginTop: 10,
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
