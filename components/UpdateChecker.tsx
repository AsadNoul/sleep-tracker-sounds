import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import updateService from '../services/updateService';
import { UpdateModal } from './UpdateModal';
import { useToast } from '../contexts/ToastContext';

interface UpdateCheckerProps {
  onUpdateComplete?: () => void;
}

export default function UpdateChecker({ onUpdateComplete }: UpdateCheckerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [version, setVersion] = useState<string | undefined>();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const { showToast } = useToast();

  const applyPendingUpdateWithToast = async () => {
    const hasPending = await updateService.hasPendingAutoUpdate();
    if (!hasPending) return;

    showToast('Update downloaded. Applying improvements in 2 seconds…', 'info', 2400);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await updateService.applyPendingAutoUpdateIfAny();
  };

  useEffect(() => {
    runLaunchAutoUpdate();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const runLaunchAutoUpdate = async () => {
    if (__DEV__) return;

    try {
      await applyPendingUpdateWithToast();
      await updateService.autoCheckAndPrepareUpdate({ force: true, applyImmediately: false });
      onUpdateComplete?.();
    } catch (error) {
      console.error('[UpdateChecker] Launch auto-update cycle failed:', error);
      checkForUpdates();
    }
  };

  const handleAppStateChange = async (nextState: AppStateStatus) => {
    const wasInBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
    appStateRef.current = nextState;

    if (!wasInBackground || nextState !== 'active') return;

    try {
      await applyPendingUpdateWithToast();
      await updateService.autoCheckAndPrepareUpdate({ force: false, applyImmediately: false });
    } catch (error) {
      console.error('[UpdateChecker] Foreground auto-update cycle failed:', error);
    }
  };

  const checkForUpdates = async () => {
    if (__DEV__) {
      console.log('[UpdateChecker] Skipped in dev mode');
      return;
    }

    try {
      console.log('[UpdateChecker] Checking for OTA update on launch...');
      const updateInfo = await updateService.checkForUpdates();

      if (updateInfo.isAvailable) {
        console.log('[UpdateChecker] Update available — showing modal');
        setIsEmergency(updateInfo.isEmergency ?? false);
        setVersion(updateInfo.manifest?.version);
        setShowUpdateModal(true);
      } else {
        console.log('[UpdateChecker] App is up to date');
        onUpdateComplete?.();
      }
    } catch (error) {
      console.error('[UpdateChecker] Unexpected error:', error);
      onUpdateComplete?.();
    }
  };

  const handleUpdate = async () => {
    await updateService.downloadAndApplyUpdate();
    // reloadAsync is called inside — we only reach here on failure (thrown)
  };

  const handleSkip = () => {
    setShowUpdateModal(false);
    onUpdateComplete?.();
  };

  return (
    <UpdateModal
      visible={showUpdateModal}
      onUpdate={handleUpdate}
      onSkip={handleSkip}
      isEmergency={isEmergency}
      version={version}
    />
  );
}
