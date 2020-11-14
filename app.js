'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");

class TwinklyApp extends Homey.App {

  onInit() {
    this.log('Initializing Twinkly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getActionCard('changeSingleColor')
      .registerRunListener(async (args) => {
        let rgbcolor = tinycolor(args.color).toRgb();
        let frames = [await this.util.generateFullFrame({r: Number(rgbcolor.r), g: Number(rgbcolor.g), b: Number(rgbcolor.b)}, args.device.getStoreValue("number_of_led"))];
        let movieFormat = await this.util.convertMovieFormat({frames: frames, delay: 5000});
        await this.util.sendCommand('/xled/v1/led/mode', args.device.getStoreValue("token"), 'POST', JSON.stringify({"mode":"off"}), args.device.getSetting('address'));
        await this.util.sendCommand('/xled/v1/led/movie/full', args.device.getStoreValue("token"), 'POST', movieFormat.bufferArray, args.device.getSetting('address'), 'application/octet-stream');
        await this.util.sendCommand('/xled/v1/led/movie/config', args.device.getStoreValue("token"), 'POST', JSON.stringify({frame_delay: 5000, leds_number: movieFormat.lightsCount, frames_number: movieFormat.frameCount}), args.device.getSetting('address'));
        return this.util.sendCommand('/xled/v1/led/mode', args.device.getStoreValue("token"), 'POST', JSON.stringify({"mode":"movie"}), args.device.getSetting('address'));
      })

    this.homey.flow.getActionCard('switchDemoMode')
      .registerRunListener(async (args) => {
        if (args.mode == 'on') {
          return this.util.sendCommand('/xled/v1/led/mode', args.device.getStoreValue("token"), 'POST', JSON.stringify({"mode":"demo"}), args.device.getSetting('address'));
        } else {
          return this.util.sendCommand('/xled/v1/led/mode', args.device.getStoreValue("token"), 'POST', JSON.stringify({"mode":"movie"}), args.device.getSetting('address'));
        }
      })

  }

}

module.exports = TwinklyApp;
