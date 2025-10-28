import { AnalyticsData } from '@/lib/services/analytics';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportData {
  analytics: AnalyticsData;
  alertTypes: Array<{ name: string; value: number }>;
  userRoles: Array<{ name: string; value: number }>;
  incidentsTrends: Array<{ month: string; resolved: number; unresolved: number }>;
  allAlerts?: Array<any>;
  allIncidents?: Array<any>;
  allUsers?: Array<any>;
  allGeofences?: Array<any>;
}

export interface ChartImageData {
  alertTrendsChart?: string;
  alertTypesChart?: string;
  userActivityChart?: string;
  incidentsChart?: string;
  userRolesChart?: string;
}

export const exportToPDF = async (data: ExportData, chartImages?: ChartImageData): Promise<void> => {
  const doc = new jsPDF('l', 'mm', [297, 210]); // Landscape A4
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPos = 20;

  // Title
  doc.setFontSize(24);
  doc.text('Analytics & Security Reports', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Date and System Info
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Executive Summary Section
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80);
  doc.text('Executive Summary', 20, yPos);
  yPos += 10;
  doc.setFontSize(11);

  const summaryMetrics = [
    `Total Users: ${data.analytics.total_users}`,
    `Active Users: ${data.analytics.active_users} (${((data.analytics.active_users / data.analytics.total_users) * 100).toFixed(1)}% active)`,
    `Total Geofences: ${data.analytics.total_geofences}`,
    `Active Geofences: ${data.analytics.active_geofences} (${data.analytics.total_geofences > 0 ? ((data.analytics.active_geofences / data.analytics.total_geofences) * 100).toFixed(1) : 0}% active)`,
    `Total Alerts (Last 30 Days): ${data.analytics.alerts_last_30_days}`,
    `Alerts Today: ${data.analytics.alerts_today}`,
    `Critical Alerts: ${data.analytics.critical_alerts}`,
    `Average Response Time: ${data.analytics.avg_response_time} minutes`,
    `Incident Resolution Rate: ${data.analytics.resolution_rate}%`,
  ];

  summaryMetrics.forEach((metric) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`• ${metric}`, 25, yPos);
    yPos += 7;
  });

  yPos += 10;

  // Alert Types Breakdown
  if (data.alertTypes && data.alertTypes.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text('Alert Types Breakdown', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);

    data.alertTypes.forEach((item) => {
      const percentage = data.analytics.alerts_last_30_days > 0 
        ? ((item.value / data.analytics.alerts_last_30_days) * 100).toFixed(1)
        : 0;
      doc.text(`${item.name}: ${item.value} alerts (${percentage}%)`, 25, yPos);
      yPos += 7;
    });
    yPos += 10;
  }

  // User Roles Breakdown
  if (data.userRoles && data.userRoles.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text('User Roles Breakdown', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);

    const totalUsers = data.userRoles.reduce((sum, item) => sum + item.value, 0);
    data.userRoles.forEach((item) => {
      const percentage = totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(1) : 0;
      doc.text(`${item.name}: ${item.value} users (${percentage}%)`, 25, yPos);
      yPos += 7;
    });
    yPos += 10;
  }

  // Detailed Data Tables
  if (data.allAlerts && data.allAlerts.length > 0) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text('Recent Alerts Detail', 20, yPos);
    yPos += 10;
    doc.setFontSize(8);

    // Table headers
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    
    doc.text('ID', 20, yPos);
    doc.text('Type', 50, yPos);
    doc.text('Severity', 90, yPos);
    doc.text('Status', 130, yPos);
    doc.text('Date', 165, yPos);
    yPos += 5;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 3;

    // Table rows (limit to last 20)
    data.allAlerts.slice(-20).forEach((alert) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(16);
        doc.text('Recent Alerts Detail (continued)', 20, yPos);
        yPos += 10;
        doc.setFontSize(8);
      }

      doc.text(`${alert.id}`, 20, yPos);
      doc.text(`${alert.alert_type || 'N/A'}`, 50, yPos);
      doc.text(`${alert.severity || 'N/A'}`, 90, yPos);
      doc.text(`${alert.is_resolved ? 'Resolved' : 'Active'}`, 130, yPos);
      doc.text(`${alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-US') : 'N/A'}`, 165, yPos);
      yPos += 6;
    });
  }

  // Save the PDF
  doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = async (data: ExportData): Promise<void> => {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    ['Analytics & Security Report', ''],
    ['Generated', new Date().toLocaleString('en-US')],
    [''],
    ['Executive Summary', ''],
    ['Metric', 'Value', 'Percentage', 'Details'],
    ['Total Users', data.analytics.total_users, '', `Active: ${data.analytics.active_users}`],
    ['Active Users', data.analytics.active_users, `${((data.analytics.active_users / data.analytics.total_users) * 100).toFixed(1)}%`, ''],
    ['Total Geofences', data.analytics.total_geofences, '', `Active: ${data.analytics.active_geofences}`],
    ['Active Geofences', data.analytics.active_geofences, `${data.analytics.total_geofences > 0 ? ((data.analytics.active_geofences / data.analytics.total_geofences) * 100).toFixed(1) : 0}%`, ''],
    ['Total Alerts (30d)', data.analytics.alerts_last_30_days, '', ''],
    ['Alerts Today', data.analytics.alerts_today, '', ''],
    ['Critical Alerts', data.analytics.critical_alerts, '', ''],
    ['Avg Response Time', `${data.analytics.avg_response_time} min`, '', ''],
    ['Resolution Rate', `${data.analytics.resolution_rate}%`, '', ''],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // 2. Alert Types Breakdown
  if (data.alertTypes && data.alertTypes.length > 0) {
    const alertTypesData = [
      ['Alert Types Breakdown', '', '', ''],
      ['Type', 'Count', 'Percentage', 'Average per Day (30d)'],
      ...data.alertTypes.map(item => [
        item.name,
        item.value,
        `${data.analytics.alerts_last_30_days > 0 ? ((item.value / data.analytics.alerts_last_30_days) * 100).toFixed(2) : 0}%`,
        (item.value / 30).toFixed(2),
      ]),
    ];
    const alertTypesWs = XLSX.utils.aoa_to_sheet(alertTypesData);
    XLSX.utils.book_append_sheet(wb, alertTypesWs, 'Alert Types');
  }

  // 3. User Roles Breakdown
  if (data.userRoles && data.userRoles.length > 0) {
    const totalUsers = data.userRoles.reduce((sum, item) => sum + item.value, 0);
    const userRolesData = [
      ['User Roles Breakdown', '', '', ''],
      ['Role', 'Count', 'Percentage', 'Ratio'],
      ...data.userRoles.map(item => [
        item.name,
        item.value,
        `${totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(2) : 0}%`,
        `1:${totalUsers > 0 ? (totalUsers / item.value).toFixed(2) : 0}`,
      ]),
    ];
    const userRolesWs = XLSX.utils.aoa_to_sheet(userRolesData);
    XLSX.utils.book_append_sheet(wb, userRolesWs, 'User Roles');
  }

  // 4. Detailed Alerts Data (100+ rows)
  if (data.allAlerts && data.allAlerts.length > 0) {
    const alertsData = [
      ['Detailed Alerts Data', '', '', '', '', '', '', ''],
      ['ID', 'Type', 'Severity', 'Status', 'Geofence ID', 'User ID', 'Created', 'Resolved', 'Response Time (min)'],
      ...data.allAlerts.map(alert => [
        alert.id,
        alert.alert_type || 'N/A',
        alert.severity || 'N/A',
        alert.is_resolved ? 'Resolved' : 'Active',
        alert.geofence || 'N/A',
        alert.user || 'N/A',
        alert.created_at ? new Date(alert.created_at).toLocaleString('en-US') : 'N/A',
        alert.resolved_at ? new Date(alert.resolved_at).toLocaleString('en-US') : 'N/A',
        alert.resolved_at && alert.created_at 
          ? ((new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / (1000 * 60)).toFixed(2)
          : 'N/A',
      ]),
    ];
    const alertsWs = XLSX.utils.aoa_to_sheet(alertsData);
    XLSX.utils.book_append_sheet(wb, alertsWs, 'All Alerts');
  }

  // 5. Detailed Incidents Data
  if (data.allIncidents && data.allIncidents.length > 0) {
    const incidentsData = [
      ['Detailed Incidents Data', '', '', '', '', '', ''],
      ['ID', 'Geofence ID', 'Status', 'Severity', 'Description', 'Created', 'Resolved'],
      ...data.allIncidents.map(incident => [
        incident.id,
        incident.geofence || 'N/A',
        incident.is_resolved ? 'Resolved' : 'Active',
        incident.severity || 'N/A',
        incident.description || 'N/A',
        incident.created_at ? new Date(incident.created_at).toLocaleString('en-US') : 'N/A',
        incident.resolved_at ? new Date(incident.resolved_at).toLocaleString('en-US') : 'N/A',
      ]),
    ];
    const incidentsWs = XLSX.utils.aoa_to_sheet(incidentsData);
    XLSX.utils.book_append_sheet(wb, incidentsWs, 'All Incidents');
  }

  // 6. Detailed Users Data
  if (data.allUsers && data.allUsers.length > 0) {
    const usersData = [
      ['Detailed Users Data', '', '', '', '', '', '', ''],
      ['ID', 'Username', 'Email', 'Role', 'Organization', 'Status', 'Joined', 'Last Login'],
      ...data.allUsers.map(user => [
        user.id,
        user.username || 'N/A',
        user.email || 'N/A',
        user.role || 'N/A',
        user.organization_name || 'N/A',
        user.is_active ? 'Active' : 'Inactive',
        user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US') : 'N/A',
        user.last_login ? new Date(user.last_login).toLocaleDateString('en-US') : 'Never',
      ]),
    ];
    const usersWs = XLSX.utils.aoa_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, usersWs, 'All Users');
  }

  // 7. Detailed Geofences Data
  if (data.allGeofences && data.allGeofences.length > 0) {
    const geofencesData = [
      ['Detailed Geofences Data', '', '', '', '', '', ''],
      ['ID', 'Name', 'Organization', 'Status', 'Created', 'Updated', 'Center Point'],
      ...data.allGeofences.map(geofence => [
        geofence.id,
        geofence.name || 'N/A',
        geofence.organization_name || 'N/A',
        geofence.active ? 'Active' : 'Inactive',
        geofence.created_at ? new Date(geofence.created_at).toLocaleDateString('en-US') : 'N/A',
        geofence.updated_at ? new Date(geofence.updated_at).toLocaleDateString('en-US') : 'N/A',
        geofence.center_point || 'N/A',
      ]),
    ];
    const geofencesWs = XLSX.utils.aoa_to_sheet(geofencesData);
    XLSX.utils.book_append_sheet(wb, geofencesWs, 'All Geofences');
  }

  // 8. Incidents Trends Sheet
  if (data.incidentsTrends && data.incidentsTrends.length > 0) {
    const incidentsTrendsData = [
      ['Incidents Trends - Monthly', '', '', '', ''],
      ['Month', 'Resolved', 'Unresolved', 'Total', 'Resolution Rate (%)'],
      ...data.incidentsTrends.map(item => [
        item.month,
        item.resolved,
        item.unresolved,
        item.resolved + item.unresolved,
        ((item.resolved / (item.resolved + item.unresolved)) * 100).toFixed(1),
      ]),
    ];
    const incidentsTrendsWs = XLSX.utils.aoa_to_sheet(incidentsTrendsData);
    XLSX.utils.book_append_sheet(wb, incidentsTrendsWs, 'Incidents Trends');
  }

  // Write file
  XLSX.writeFile(wb, `analytics-report-detailed-${new Date().toISOString().split('T')[0]}.xlsx`);
};

