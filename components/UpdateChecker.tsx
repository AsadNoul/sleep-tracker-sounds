import React, { useState, useEffect } from 'react';
import updateService from '../services/updateService';
import { UpdateModal } from './UpdateModal';

interface UpdateCheckerProps {
  onUpdateComplete?: () => void;
}

export default function UpdateChecker({ onUpdateComplete }: UpdateCheckerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    // Skip in development mode
    if (__DEV__) {
      console.log('⚠️ OTA Updates disabled in development mode');
      return;
    }

    try {
      console.log('🔍 Checking for updates on app start...');
      const updateInfo = await updateService.checkForUpdates();

      if (updateInfo.isAvailable) {
        console.log('✅ Update available! Showing modal...');
        setIsEmergency(updateInfo.isEmergency || false);
        setVersion(updateInfo.manifest?.version);
        setShowUpdateModal(true);
      } else {
        console.log('✅ App is up to date!');
        onUpdateComplete?.();
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      onUpdateComplete?.();
    }
  };

  const handleUpdate = async () => {
    try {
      console.log('⬇️ Starting update download...');
      await updateService.downloadAndApplyUpdate();
      // App will reload automatically after update
    } catch (error) {
      console.error('❌ Update failed:', error);
      setShowUpdateModal(false);
      onUpdateComplete?.();
    }
  };

  return (
    <UpdateModal
      visible={showUpdateModal}
      onUpdate={handleUpdate}
      isEmergency={isEmergency}
      version={version}
    />
  );
}
