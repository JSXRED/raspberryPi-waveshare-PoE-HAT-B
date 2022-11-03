// Configuration value, from how much C° the fan should start.
const MAXHEAT = 50;

// require system modules
const spawn = require("child_process").spawn;
const os = require("os");

// require custom module
const font = require("oled-font-5x7");
const i2c = require("i2c-bus");
const oledI2cBus = require("oled-i2c-bus");

/**
 * piHAT class to control the waveshare POE HAT with node.JS
 */
class piHAT {
    constructor() {
    }
    /**
     * Writes the text on the display
     * @param {string} str 
     */
    writeToDisplay(str) {
        let i2cBus = i2c.openSync(1);

        let opts = {
            width: 128,
            height: 32,
            address: 0x3C
        };
        let oled = new oledI2cBus(i2cBus, opts);

        oled.setCursor(1, 1);
        oled.writeString(font, 1, str, 1, true);
        oled.update();
    }
/**
 * Fetches the current temperature of the Raspberry PI
 */
    getTemperature() {
        return new Promise((resolve, reject) => {
            let vcgencmd = spawn("vcgencmd", ["measure_temp"]);
            vcgencmd.stdout.on("data", buff =>
                resolve(buff.toString("utf8").split("=")[1].split("'")[0])
            );
            vcgencmd.stderr.on("data", buff => reject(buff.toString("utf8")));
        });
    }
/**
 * Switches the fan on or off
 * @param {boolean} shouldOn 
 */
    writeI2c(shouldOn) {
        return new Promise((resolve, reject) => {
            let wbuf = null;
            if (!shouldOn) {
                // fan off
                wbuf = Buffer.from([0x01]);
            } else {
                // fan on
                wbuf = Buffer.from([0xFE]);
            }
            i2c.openPromisified(1).then(i2c1 => i2c1.i2cWrite(0x20, wbuf.length, wbuf).then(_ => { i2c1.close(); resolve(); })).catch(reject);
        });
    }
}

let hat = new piHAT();
// Write current temperature and status of the fan on the display.
(async () => {
    let temp = await hat.getTemperature();
    if (temp >= MAXHEAT) {
        hat.writeI2c(true);
        console.log(`:: Hotter than expected => FAN ON ${temp} C°`);
        hat.writeToDisplay(`@${os.hostname()} (FAN: ON; ${temp})`);
    } else {
        hat.writeI2c(false);
        console.log(`:: Everything fine => FAN OFF ${temp} C°`);
        hat.writeToDisplay(`@${os.hostname()} (FAN: OFF; ${temp})`);
    }
})();