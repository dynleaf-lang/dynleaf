import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const API_BASE_URL = getApiBase();

class SettingsService {
  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Get printer settings for a specific branch
   * @param {string} branchId - The branch ID
   * @returns {Promise<Object>} The printer configuration
   */
  async getPrinterSettings(branchId) {
    try {
      const response = await axios.get(`${this.apiUrl}/branches/${branchId}/printer-settings`);
      return response.data.printerConfig;
    } catch (error) {
      console.error('Error fetching printer settings:', error);
      throw error;
    }
  }

  /**
   * Save printer settings for a specific branch
   * @param {string} branchId - The branch ID
   * @param {Object} printerConfig - The printer configuration to save
   * @returns {Promise<Object>} The updated branch data
   */
  async savePrinterSettings(branchId, printerConfig) {
    try {
      const response = await axios.patch(`${this.apiUrl}/branches/${branchId}/settings`, {
        settings: {
          printerConfig: {
            paymentUPIVPA: printerConfig.paymentUPIVPA || '',
            paymentUPIName: printerConfig.paymentUPIName || '',
            showQRCode: printerConfig.showQRCode !== false,
            showFooterMessage: printerConfig.showFooterMessage !== false,
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error saving printer settings:', error);
      throw error;
    }
  }
}

export default new SettingsService();
