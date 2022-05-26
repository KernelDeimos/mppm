const path_ = require('path');
const fs_ = require('fs');
const readline_ = require('readline');

const lib = {};

console.log(`=========================================`);
console.log(`<< MPPM - Mod-Packer's Package Manager >>`);
console.log(`=========================================`);

lib.ManifestManager = class ManifestManager {
    constructor (location) {
        this.location = location || path_.join(process.cwd(), 'mppm.json');
        this.data = null;
    }
    async load () {
        if ( ! await fs_.promises.access(this.location)
            .then(() => true)
            .catch(() => false)
        ) {
            console.log(`mppm.json not found in ${
                path_.dirname(path_.resolve(this.location))}`);
            if ( await this.promptYes('Create it?') ) {
                this.data = {};
            } else {
                console.error('no mppm.json created - aborting');
                process.exit(1);
            }
        } else {
            const contentsBin = await fs_.promises.readFile(this.location);
            const contentsStr = contentsBin.toString();
            const contentsObj = JSON.parse(contentsStr);
            this.data = contentsObj;
        }
    }
    async save () {
        await fs_.writeFileSync(this.location, JSON.stringify(this.data, null, '  '));
    }
    isSet ( key ) {
        return this.data.hasOwnProperty(key);
    }
    async setPromptOverwrite ( key, val ) {
        const doPrompt = async () => {
            return await this.promptYes(
                `mppm.json already has '${key}'. Replace it?`);
        }

        if ( ! this.isSet(key) || await doPrompt() ) {
            this.data[key] = val;
            await this.save();
        }
    }
    async prompt (question) {
        const readline = readline_.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return await new Promise((rslv, rjct) => {
            readline.question(question, ans => { rslv(ans); });
        });
    }
    async promptYes (question) {
        const ans = await this.prompt(question + ' (Y/n):');
        return ['Y', 'y', 'Yes', 'yes', 'YES'].includes(ans);
    }
}

lib.repositoryTypes = {
    ftp: new class FTPRepository {
        constructor (config) {
            this.config = config;
            this.Client = require('ftp');
        }
        async connect () {
            this.client = new this.Client();
            await new Promise ((rslv, rjct) => {
                this.client.on('ready', rslv);
            });
        }
        async downloadJar(jarName, writeStream) {
            this.client.get(path_.join(this.config.path, jarName), (err, stream) => {
                stream.pipe(writeStream);
            })
        }
        async close () {
            this.client.end();
        }
    }
};

module.exports = lib;
