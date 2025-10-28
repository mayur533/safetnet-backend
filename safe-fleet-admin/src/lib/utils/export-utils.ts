import { AnalyticsData } from '@/lib/services/analytics';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export interface ExportData {
  analytics: AnalyticsData;
  alertTypes: Array<{ name: string; value: number }>;
  userRoles: Array<{ name: string; value: number }>;
  incidentsTrends: Array<{ month: string; resolved: number; unresolved: number }>;
}

export const exportToPDF = async (data: ExportData): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Analytics & Reports', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Key Metrics
  doc.setFontSize(16);
  doc.text('Key Metrics', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.text(`Total Users: ${data.analytics.total_users}`, 20, yPos);
  yPos += 7;
  doc.text(`Active Users: ${data.analytics.active_users}`, 20, yPos);
  yPos += 7;
  doc.text(`Total Geofences: ${data.analytics.total_geofences}`, 20, yPos);
  yPos += 7;
  doc.text(`Active Geofences: ${data.analytics.active_geofences}`, 20, yPos);
  yPos += 7;
  doc.text(`Total Alerts (30d): ${data.analytics.alerts_last_30_days}`, 20, yPos);
  yPos += 7;
  doc.text(`Alerts Today: ${data.analytics.alerts_today}`, 20, yPos);
  yPos += 7;
  doc.text(`Critical Alerts: ${data.analytics.critical_alerts}`, 20, yPos);
  yPos += 7;
  doc.text(`Avg Response Time: ${data.analytics.avg_response_time} min`, 20, yPos);
  yPos += 7;
  doc.text(`Resolution Rate: ${data.analytics.resolution_rate}%`, 20, yPos);
  yPos += 15;

  // Check if we need a new page
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  // Alert Types Distribution
  if (data.alertTypes && data.alertTypes.length > 0) {
    doc.setFontSize(16);
    doc.text('Alert Types Distribution', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    data.alertTypes.forEach((item) => {
      doc.text(`${item.name}: ${item.value}`, 20, yPos);
      yPos += 7;
    });
    yPos += 10;
  }

  // Check if we need a new page
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  // User Roles Distribution
  if (data.userRoles && data.userRoles.length > 0) {
    doc.setFontSize(16);
    doc.text('User Roles Distribution', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    data.userRoles.forEach((item) => {
      doc.text(`${item.name}: ${item.value}`, 20, yPos);
      yPos += 7;
    });
    yPos += 10;
  }

  // Save the PDF
  doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = async (data: ExportData): Promise<void> => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Key Metrics Sheet
  const metricsData = [
    ['Metric', 'Value'],
    ['Total Users', data.analytics.total_users],
    ['Active Users', data.analytics.active_users],
    ['Total Geofences', data.analytics.total_geofences],
    ['Active Geofences', data.analytics.active_geofences],
    ['Total Alerts (30d)', data.analytics.alerts_last_30_days],
    ['Alerts Today', data.analytics.alerts_today],
    ['Critical Alerts', data.analytics.critical_alerts],
    ['Avg Response Time (min)', data.analytics.avg_response_time],
    ['Resolution Rate (%)', data.analytics.resolution_rate],
  ];
  const metricsWs = XLSX.utils.aoa_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(wb, metricsWs, 'Key Metrics');

  // Alert Types Sheet
  if (data.alertTypes && data.alertTypes.length > 0) {
    const alertTypesData = [
      ['Alert Type', 'Count'],
      ...data.alertTypes.map(item => [item.name, item.value]),
    ];
    const alertTypesWs = XLSX.utils.aoa_to_sheet(alertTypesData);
    XLSX.utils.book_append_sheet(wb, alertTypesWs, 'Alert Types');
  }

  // User Roles Sheet
  if (data.userRoles && data.userRoles.length > 0) {
    const userRolesData = [
      ['Role', 'Count'],
      ...data.userRoles.map(item => [item.name, item.value]),
    ];
    const userRolesWs = XLSX.utils.aoa_to_sheet(userRolesData);
    XLSX.utils.book_append_sheet(wb, userRolesWs, 'User Roles');
  }

  // Incidents Trends Sheet
  if (data.incidentsTrends && data.incidentsTrends.length > 0) {
    const incidentsData = [
      ['Month', 'Resolved', 'Unresolved', 'Total'],
      ...data.incidentsTrends.map(item => [
        item.month,
        item.resolved,
        item.unresolved,
        item.resolved + item.unresolved,
      ]),
    ];
    const incidentsWs = XLSX.utils.aoa_to_sheet(incidentsData);
    XLSX.utils.book_append_sheet(wb, incidentsWs, 'Incidents Trends');
  }

  // Write file
  XLSX.writeFile(wb, `analytics-report-${new Date().toISOString().split('T')[0]}.xlsx`);
};

