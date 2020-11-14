'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class TwinklyDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // START POLLING
    this.updateToken();
    this.pollDevice();

    // UPDATE LIGHT PROFILE
    setTimeout(() => {
      this.updateTwinklyStore();
    }, 5000);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      if (value) {
        return this.util.sendCommand('/xled/v1/led/mode', this.getStoreValue("token"), 'POST', JSON.stringify({"mode":"movie"}), this.getSetting('address'));
      } else {
        return this.util.sendCommand('/xled/v1/led/mode', this.getStoreValue("token"), 'POST', JSON.stringify({"mode":"off"}), this.getSetting('address'));
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  async updateToken() {
    try {
      const token = await this.util.returnToken(this.getSetting('address'));
      this.setStoreValue("token", token);
    } catch (error) {
      this.log(error);
    }
  }

  async updateTwinklyStore() {
    try {
      let data = await this.util.getDeviceInfo(this.getSetting('address'));
      this.setStoreValue("product_code", data.product_code);
      this.setStoreValue("hw_id", data.hw_id);
      this.setStoreValue("mac", data.mac);
      this.setStoreValue("max_supported_led", data.max_supported_led);
      this.setStoreValue("base_leds_number", data.base_leds_number);
      this.setStoreValue("number_of_led", data.number_of_led);
      this.setStoreValue("led_profile", data.led_profile);
      this.setStoreValue("frame_rate", data.frame_rate);
      this.setStoreValue("movie_capacity", data.movie_capacity);
    } catch (error) {
      this.log(error);
    }
  }

  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/xled/v1/led/mode', this.getStoreValue("token"), 'GET', '', this.getSetting('address'));
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        let onoff = result.mode === 'off' ? false : true;

        // capability onoff
        if (onoff != this.getCapabilityValue('onoff')) {
          this.setCapabilityValue('onoff', onoff);
        }
      } catch (error) {
        if (error == 'Error: 401') {
          this.updateToken();
        } else {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();
        }
      }
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/xled/v1/led/mode', this.getStoreValue("token"), 'GET', '', this.getSetting('address'));
        this.pollDevice();
      } catch (error) {
        if (error == 'Error: 401') {
          this.updateToken();
          setTimeout(() => {
            this.pollDevice();
          }, 5000);
        } else {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        }
      }
    }, 63000);
  }

}

module.exports = TwinklyDevice;
