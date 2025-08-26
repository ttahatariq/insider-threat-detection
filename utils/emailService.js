const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tahatariq531@gmail.com',
    pass: process.env.EMAIL_PASS || 'Tahatariq090078601'
  }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Send email to admin about suspicious behavior
const sendAdminAlert = async (user, behavior, riskScore, details) => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: 'tahatariq273@gmail.com',
      subject: `🚨 Security Alert: Suspicious Behavior Detected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">🚨 Security Alert</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <h2 style="color: #dc3545;">Suspicious Behavior Detected</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #495057;">User Information</h3>
              <p><strong>Name:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Role:</strong> ${user.role}</p>
              <p><strong>User ID:</strong> ${user._id}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">Behavior Details</h3>
              <p><strong>Action:</strong> ${behavior}</p>
              <p><strong>Risk Score:</strong> ${(riskScore * 100).toFixed(1)}%</p>
              <p><strong>Details:</strong> ${details}</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #0c5460;">Risk Assessment</h3>
              ${riskScore > 0.8 ? '<p style="color: #721c24; font-weight: bold;">⚠️ HIGH RISK - Immediate action required</p>' : ''}
              ${riskScore > 0.6 ? '<p style="color: #856404; font-weight: bold;">⚠️ MEDIUM RISK - Monitor closely</p>' : ''}
              ${riskScore <= 0.6 ? '<p style="color: #155724; font-weight: bold;">ℹ️ LOW RISK - Standard monitoring</p>' : ''}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6c757d; font-size: 14px;">
                This is an automated security alert. Please review and take appropriate action.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Admin alert email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send admin alert email:', error);
    return false;
  }
};

// Send weekly behavior summary to admin
const sendWeeklySummary = async (summaryData) => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: 'tahatariq273@gmail.com',
      subject: `📊 Weekly Security Behavior Summary`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">📊 Weekly Security Summary</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <h2 style="color: #007bff;">AI-Powered Behavior Analysis Report</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #495057;">Summary Statistics</h3>
              <p><strong>Total Suspicious Activities:</strong> ${summaryData.totalSuspicious}</p>
              <p><strong>Users with Multiple Violations:</strong> ${summaryData.usersWithViolations}</p>
              <p><strong>Blocked Users:</strong> ${summaryData.blockedUsers}</p>
              ${summaryData.monitoredUsers ? `<p><strong>Users Under Monitoring:</strong> ${summaryData.monitoredUsers}</p>` : ''}
              <p><strong>Period:</strong> ${summaryData.period}</p>
            </div>
            
            ${summaryData.aiInsights ? `
              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #1565c0;">AI Insights</h3>
                <p><strong>Total Users Analyzed:</strong> ${summaryData.aiInsights.totalUsersAnalyzed}</p>
                <p><strong>Average Risk Score:</strong> ${(summaryData.aiInsights.averageRiskScore * 100).toFixed(1)}%</p>
                <p><strong>High Risk Percentage:</strong> ${summaryData.aiInsights.highRiskPercentage}%</p>
              </div>
            ` : ''}
            
            ${summaryData.userViolations.length > 0 ? `
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">Users with Multiple Violations</h3>
                ${summaryData.userViolations.map(user => `
                  <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
                    <p><strong>${user.name}</strong> (${user.email}) - ${user.role}</p>
                    <p>Violations: ${user.violationCount} | Risk Score: ${(user.avgRiskScore * 100).toFixed(1)}%</p>
                    ${user.action ? `<p><strong>Action Taken:</strong> ${user.action}</p>` : ''}
                    ${user.analysis ? `<p><strong>AI Analysis:</strong> ${user.analysis}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6c757d; font-size: 14px;">
                This report was generated using AI-powered threat detection. Review these patterns and consider additional security measures if needed.
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Weekly summary email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send weekly summary email:', error);
    return false;
  }
};

module.exports = {
  sendAdminAlert,
  sendWeeklySummary
};
