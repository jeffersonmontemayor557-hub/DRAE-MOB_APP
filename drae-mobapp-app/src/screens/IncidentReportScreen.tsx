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
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { goBackOrMainTabs } from '../navigation/goBackOrMainTabs';
import { DASMARINAS_BARANGAYS } from '../constants/dasmarinasBarangays';
import { persistPickedMediaUri } from '../utils/persistMediaUri';
import { useAppData } from '../context/AppDataContext';
import { trySubmitIncidentReportOrQueue } from '../services/incidentReportQueue';
import { alertPermissionBlocked, confirmPermissionStep } from '../utils/permissionDialogs';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'IncidentReport'>;

const hazards = ['Landslide', 'Earthquake', 'Flood', 'Fire', 'Others'];

const BARANGAY_MODAL_SHEET_HEIGHT = Math.min(
  560,
  Math.round(Dimensions.get('window').height * 0.72),
);

export default function IncidentReportScreen({ navigation, route }: Props) {
  const { profile, profileRecordId } = useAppData();
  const [hazard, setHazard] = useState(route.params?.prefillHazard ?? 'Landslide');
  const [barangay, setBarangay] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [barangayPickerOpen, setBarangayPickerOpen] = useState(false);
  const [barangayQuery, setBarangayQuery] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 150);
  const playerSource = useMemo(() => (audioUri ? { uri: audioUri } : null), [audioUri]);
  const player = useAudioPlayer(playerSource, { updateInterval: 150 });
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (barangayPickerOpen) {
      setBarangayQuery('');
    }
  }, [barangayPickerOpen]);

  const filteredBarangays = useMemo(() => {
    const q = barangayQuery.trim().toLowerCase();
    if (!q) {
      return DASMARINAS_BARANGAYS;
    }
    return DASMARINAS_BARANGAYS.filter((name) => name.toLowerCase().includes(q));
  }, [barangayQuery]);

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
      try {
        const stableUri = await persistPickedMediaUri(result.assets[0].uri, 'incident-photo');
        setPhotoUri(stableUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save the photo file.';
        Alert.alert('Photo Error', message);
      }
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
      const rawUri = status.url ?? recorder.uri ?? null;
      if (rawUri) {
        try {
          setAudioUri(await persistPickedMediaUri(rawUri, 'incident-audio'));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not save the recording file.';
          Alert.alert('Audio Error', message);
          setAudioUri(null);
        }
      } else {
        setAudioUri(null);
      }
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
    if (!barangay) {
      Alert.alert('Location', 'Please select the barangay where the incident occurred.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing details', 'Please provide incident details.');
      return;
    }

    const locationText = locationDetail.trim()
      ? `${barangay}, Dasmariñas City, Cavite — ${locationDetail.trim()}`
      : `${barangay}, Dasmariñas City, Cavite`;

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch {
      /* GPS is optional; report still submits with barangay text only */
    }

    setIsSubmitting(true);
    try {
      const outcome = await trySubmitIncidentReportOrQueue({
        profileId: profileRecordId,
        reporterName: profile.fullName,
        reporterContact: profile.contactNumber,
        hazardType: hazard,
        locationText,
        description,
        photoUri,
        audioUri,
        latitude,
        longitude,
      });

      if (outcome.mode === 'queued') {
        Alert.alert(
          'Saved offline',
          'No connection or the server was unreachable. Your report is stored on this device and will send automatically when you are online. You can check status under Profile → My Reports.',
          [{ text: 'OK', onPress: () => goBackOrMainTabs(navigation) }],
        );
        return;
      }

      const assignNote = outcome.result.assignedStaffName
        ? `\n\nAssigned responder: ${outcome.result.assignedStaffName}.`
        : '\n\nYou are in queue. All CDRRMO responders are currently handling other emergencies — you will be notified the moment one is assigned to you.';

      Alert.alert(
        'Report Submitted',
        `Thank you${profile.fullName ? `, ${profile.fullName}` : ''}. Your ${hazard.toLowerCase()} report has been sent to CDRRMO.${assignNote}`,
        [{ text: 'OK', onPress: () => goBackOrMainTabs(navigation) }],
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
        For incidents in Dasmariñas City, Cavite. Optional photo or voice evidence.
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

      <Text style={styles.label}>Barangay</Text>
      <TouchableOpacity
        style={styles.selectField}
        onPress={() => setBarangayPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select barangay"
      >
        <Text style={barangay ? styles.selectFieldText : styles.selectFieldPlaceholder}>
          {barangay || 'Select barangay…'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.primaryDark} />
      </TouchableOpacity>

      <Text style={styles.label}>Street / landmark (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. near school, zone, purok"
        value={locationDetail}
        onChangeText={setLocationDetail}
      />

      <Modal
        visible={barangayPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBarangayPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: BARANGAY_MODAL_SHEET_HEIGHT }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Barangay — Dasmariñas City</Text>
              <TouchableOpacity
                onPress={() => setBarangayPickerOpen(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchRow}>
              <Ionicons name="search" size={20} color={colors.muted} style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search barangay…"
                placeholderTextColor={colors.muted}
                value={barangayQuery}
                onChangeText={setBarangayQuery}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                accessibilityLabel="Search barangays"
              />
              {barangayQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setBarangayQuery('')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={22} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              style={styles.modalList}
              data={filteredBarangays}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>
                  No barangay matches &quot;{barangayQuery.trim()}&quot;. Try another spelling.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setBarangay(item);
                    setBarangayPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      item === barangay && styles.modalRowTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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

      <Text style={styles.gpsHint}>
        If you allow location when prompted, we attach approximate GPS to help CDRRMO prioritize by distance.
        You can still submit without it.
      </Text>

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
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  selectFieldText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  selectFieldPlaceholder: {
    flex: 1,
    color: colors.muted,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    flex: 1,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalSearchIcon: {
    marginLeft: 2,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalList: {
    flex: 1,
  },
  modalEmptyText: {
    textAlign: 'center',
    color: colors.muted,
    paddingHorizontal: 24,
    paddingVertical: 28,
    fontSize: 15,
    lineHeight: 22,
  },
  modalRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  modalRowText: {
    fontSize: 16,
    color: colors.text,
  },
  modalRowTextSelected: {
    color: colors.primary,
    fontWeight: '700',
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
  gpsHint: {
    marginTop: 14,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    paddingHorizontal: 2,
  },
  submitButton: {
    marginTop: 12,
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
