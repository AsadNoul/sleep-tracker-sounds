import React, { useState, useEffect } from 'react';
import updateService from '../services/updateService';
import { UpdateModal } from './UpdateModal';

interface UpdateCheckerProps {
  onUpdateComplete?: () => void;
}

export default function UpdateChecker({ onUpdateComplete }: UpdateCheckerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [version, setVersion] = useState<string | undefined>();

  useEffect(() => {
    checkForUpdates();
  }, []);

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
