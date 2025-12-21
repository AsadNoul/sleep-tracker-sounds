import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// Use legacy API to avoid deprecation warnings on writeAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
import { format12HourTime, formatDuration } from './dateFormatting';

// Some environments may not expose EncodingType constants; fall back to UTF-8 string
const UTF8_ENCODING = (FileSystem as any)?.EncodingType?.UTF8 ?? 'utf8';

interface ExportData {
  userEmail: string;
  exportDate: string;
  sleepSessions: any[];
  journalEntries: any[];
  profile?: any;
}

export type ExportFormat = 'pdf' | 'csv' | 'json';

export const generatePDFReport = async (data: ExportData): Promise<string> => {
  const { userEmail, exportDate, sleepSessions, journalEntries, profile } = data;

  // Calculate statistics
  const totalSessions = sleepSessions.length;
  const totalHours = sleepSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / (1000 * 60 * 60);
  const avgQuality = sleepSessions.length > 0
    ? sleepSessions.reduce((sum, session) => sum + (session.quality || 0), 0) / sleepSessions.length
    : 0;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sleep Tracker Data Export</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #00FFD1;
        }
        .header h1 {
          color: #0F111A;
          font-size: 32px;
          margin-bottom: 10px;
        }
        .header .subtitle {
          color: #666;
          font-size: 14px;
        }
        .info-box {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .info-box p {
          margin: 8px 0;
        }
        .info-box strong {
          color: #0F111A;
        }
        .section {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 24px;
          color: #0F111A;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #00FFD1;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e0e0e0;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #00FFD1;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: #fff;
        }
        .table thead {
          background: #0F111A;
          color: #fff;
        }
        .table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }
        .table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
        }
        .table tbody tr:hover {
          background: #f9f9f9;
        }
        .quality-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .quality-excellent { background: #4CAF50; color: white; }
        .quality-good { background: #8BC34A; color: white; }
        .quality-fair { background: #FFC107; color: #333; }
        .quality-poor { background: #FF5722; color: white; }
        .journal-entry {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          border-left: 4px solid #00FFD1;
        }
        .journal-date {
          font-weight: 600;
          color: #0F111A;
          margin-bottom: 8px;
        }
        .journal-text {
          color: #555;
          line-height: 1.8;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌙 Sleep Tracker Data Export</h1>
        <p class="subtitle">Your Complete Sleep & Wellness Report</p>
      </div>

      <div class="info-box">
        <p><strong>Account:</strong> ${userEmail}</p>
        <p><strong>Export Date:</strong> ${new Date(exportDate).toLocaleString()}</p>
        <p><strong>Data Period:</strong> ${sleepSessions.length > 0
          ? `${new Date(sleepSessions[sleepSessions.length - 1]?.startTime).toLocaleDateString()} - ${new Date(sleepSessions[0]?.startTime).toLocaleDateString()}`
          : 'No data available'
        }</p>
      </div>

      <div class="section">
        <h2 class="section-title">📊 Sleep Statistics Summary</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${totalSessions}</div>
            <div class="stat-label">Total Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours.toFixed(1)}h</div>
            <div class="stat-label">Total Sleep Time</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgQuality.toFixed(1)}/5</div>
            <div class="stat-label">Average Quality</div>
          </div>
        </div>
      </div>

      ${sleepSessions.length > 0 ? `
        <div class="section">
          <h2 class="section-title">😴 Sleep Sessions (${sleepSessions.length} total)</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration</th>
                <th>Quality</th>
                <th>Wake Ups</th>
              </tr>
            </thead>
            <tbody>
              ${sleepSessions.map(session => {
                const qualityClass = session.quality >= 4 ? 'excellent' : session.quality >= 3 ? 'good' : session.quality >= 2 ? 'fair' : 'poor';
                const qualityLabel = session.quality >= 4 ? 'Excellent' : session.quality >= 3 ? 'Good' : session.quality >= 2 ? 'Fair' : 'Poor';
                return `
                  <tr>
                    <td>${new Date(session.startTime).toLocaleDateString()}</td>
                    <td>${format12HourTime(new Date(session.startTime))}</td>
                    <td>${session.endTime ? format12HourTime(new Date(session.endTime)) : 'Ongoing'}</td>
                    <td>${formatDuration(session.duration)}</td>
                    <td><span class="quality-badge quality-${qualityClass}">${qualityLabel}</span></td>
                    <td>${session.wakeUps || 0}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="section"><p style="color: #999; text-align: center; padding: 40px 0;">No sleep sessions recorded yet.</p></div>'}

      <div class="page-break"></div>

      ${journalEntries.length > 0 ? `
        <div class="section">
          <h2 class="section-title">📝 Journal Entries (${journalEntries.length} total)</h2>
          ${journalEntries.map(entry => `
            <div class="journal-entry">
              <div class="journal-date">${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              ${entry.notes ? `<div class="journal-text">${entry.notes}</div>` : ''}
              ${entry.mood ? `<p style="margin-top: 10px;"><strong>Mood:</strong> ${entry.mood}/5</p>` : ''}
              ${entry.energy_level ? `<p><strong>Energy Level:</strong> ${entry.energy_level}/5</p>` : ''}
              ${entry.stress_level ? `<p><strong>Stress Level:</strong> ${entry.stress_level}/5</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<div class="section"><p style="color: #999; text-align: center; padding: 40px 0;">No journal entries recorded yet.</p></div>'}

      <div class="footer">
        <p>© ${new Date().getFullYear()} Sleep Tracker - Your Personal Sleep & Wellness Companion</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const exportAndShareData = async (data: ExportData, format: ExportFormat = 'pdf'): Promise<void> => {
  try {
    let fileUri: string;
    let mimeType: string;
    let fileExtension: string;
    let uti: string | undefined;

    switch (format) {
      case 'csv':
        fileUri = await generateCSVReport(data);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        uti = 'public.comma-separated-values-text';
        break;
      case 'json':
        fileUri = await generateJSONReport(data);
        mimeType = 'application/json';
        fileExtension = 'json';
        uti = 'public.json';
        break;
      case 'pdf':
      default:
        fileUri = await generatePDFReport(data);
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
        uti = 'com.adobe.pdf';
        break;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export Sleep Tracker Data (${format.toUpperCase()})`,
        UTI: uti,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Export and share error:', error);
    throw error;
  }
};

// Generate CSV Report
export const generateCSVReport = async (data: ExportData): Promise<string> => {
  const { userEmail, exportDate, sleepSessions, journalEntries } = data;

  // CSV Header for Sleep Sessions
  let csvContent = '# Sleep Tracker Data Export\n';
  csvContent += `# User: ${userEmail}\n`;
  csvContent += `# Export Date: ${new Date(exportDate).toLocaleString()}\n`;
  csvContent += '\n## SLEEP SESSIONS\n';
  csvContent += 'Date,Start Time,End Time,Duration (hours),Quality (1-5),Wake Ups,Notes\n';

  // Add sleep session rows
  sleepSessions.forEach(session => {
    const date = new Date(session.startTime).toLocaleDateString();
    const startTime = format12HourTime(new Date(session.startTime));
    const endTime = session.endTime ? format12HourTime(new Date(session.endTime)) : 'Ongoing';
    const duration = session.duration ? (session.duration / (1000 * 60 * 60)).toFixed(2) : '0';
    const quality = session.quality || 'N/A';
    const wakeUps = session.wakeUps || 0;
    const notes = (session.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');

    csvContent += `"${date}","${startTime}","${endTime}",${duration},${quality},${wakeUps},"${notes}"\n`;
  });

  // Add journal entries section
  csvContent += '\n## JOURNAL ENTRIES\n';
  csvContent += 'Date,Mood (1-5),Energy Level (1-5),Stress Level (1-5),Notes\n';

  journalEntries.forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString();
    const mood = entry.mood || 'N/A';
    const energy = entry.energy_level || 'N/A';
    const stress = entry.stress_level || 'N/A';
    const notes = (entry.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');

    csvContent += `"${date}",${mood},${energy},${stress},"${notes}"\n`;
  });

  // Write to file
  const fileUri = `${FileSystem.cacheDirectory}sleep_tracker_export_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: UTF8_ENCODING,
  });

  return fileUri;
};

// Generate JSON Report
export const generateJSONReport = async (data: ExportData): Promise<string> => {
  const { userEmail, exportDate, sleepSessions, journalEntries, profile } = data;

  // Calculate statistics
  const totalSessions = sleepSessions.length;
  const totalHours = sleepSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / (1000 * 60 * 60);
  const avgQuality = sleepSessions.length > 0
    ? sleepSessions.reduce((sum, session) => sum + (session.quality || 0), 0) / sleepSessions.length
    : 0;

  const exportData = {
    metadata: {
      userEmail,
      exportDate: new Date(exportDate).toISOString(),
      exportVersion: '1.0',
      appName: 'Sleep Tracker',
    },
    statistics: {
      totalSessions,
      totalHours: parseFloat(totalHours.toFixed(2)),
      averageQuality: parseFloat(avgQuality.toFixed(2)),
      totalJournalEntries: journalEntries.length,
    },
    sleepSessions: sleepSessions.map(session => ({
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      quality: session.quality,
      wakeUps: session.wakeUps,
      notes: session.notes,
      sleepSoundsEnabled: session.sleepSoundsEnabled,
      smartAlarmEnabled: session.smartAlarmEnabled,
    })),
    journalEntries: journalEntries.map(entry => ({
      id: entry.id,
      date: entry.date,
      mood: entry.mood,
      energyLevel: entry.energy_level,
      stressLevel: entry.stress_level,
      notes: entry.notes,
      tags: entry.tags || [],
    })),
    profile: profile ? {
      id: profile.id,
      email: profile.email,
      subscriptionStatus: profile.subscription_status,
    } : null,
  };

  // Write to file
  const fileUri = `${FileSystem.cacheDirectory}sleep_tracker_export_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2), {
    encoding: UTF8_ENCODING,
  });

  return fileUri;
};
