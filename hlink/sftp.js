'use strict';

/**
 * hlink/sftp.js
 *
 * SFTP upload / download for Alberta Health H-Link.
 *
 * Folder structure on getfile.health.alberta.ca:
 *   /UPLOAD/    — PUT claim batch files here; AH moves them automatically
 *   /DOWNLOAD/  — GET batch balance reports and ARD files from here
 *   /HELP/      — read-only info (not used in day-to-day operation)
 *
 * Usage:
 *   const { HlinkSftp } = require('./sftp');
 *   const sftp = new HlinkSftp(config);
 *   await sftp.connect();
 *   await sftp.uploadBatch('HZV000530.txt', batchText);
 *   const files = await sftp.listDownloads();
 *   const content = await sftp.downloadFile(files[0].name);
 *   await sftp.disconnect();
 */

const fs   = require('fs');
const path = require('path');

class HlinkSftp {
  /**
   * @param {object} config — from loadConfig()
   */
  constructor(config) {
    this._cfg     = config;
    this._client  = null;
  }

  /**
   * Connect to Alberta Health SFTP.
   * Requires ssh2-sftp-client to be installed:  npm install  (in hlink/ folder)
   */
  async connect() {
    // Lazy-require so the module only errors if you actually call this
    const SftpClient = require('ssh2-sftp-client');
    this._client = new SftpClient();

    const connectOpts = {
      host:     this._cfg.sftp.host,
      port:     this._cfg.sftp.port,
      username: this._cfg.sftp.username,
      password: this._cfg.sftp.password,
    };

    // Prefer key-based auth if private key file exists
    const keyPath = this._cfg.sftp.privateKeyPath;
    if (keyPath && fs.existsSync(keyPath)) {
      connectOpts.privateKey = fs.readFileSync(keyPath);
    }

    await this._client.connect(connectOpts);
    console.log('[sftp] Connected to ' + this._cfg.sftp.host);
  }

  async disconnect() {
    if (this._client) {
      await this._client.end();
      this._client = null;
      console.log('[sftp] Disconnected.');
    }
  }

  /**
   * Upload a batch file to Alberta Health.
   *
   * @param {string} filename   e.g. 'HZV000530.txt'
   * @param {string} content    The formatted batch text (254-char records, CRLF)
   */
  async uploadBatch(filename, content) {
    if (!this._client) throw new Error('Not connected — call connect() first.');
    const remotePath = '/UPLOAD/' + filename;
    const buf = Buffer.from(content, 'utf8');
    await this._client.put(buf, remotePath);
    console.log('[sftp] Uploaded ' + filename + ' (' + buf.length + ' bytes) → ' + remotePath);
  }

  /**
   * List files available in /DOWNLOAD/.
   *
   * @returns {Array<{name, size, modifyTime}>}
   */
  async listDownloads() {
    if (!this._client) throw new Error('Not connected — call connect() first.');
    const items = await this._client.list('/DOWNLOAD/');
    return items
      .filter(function(f) { return f.type !== 'd'; })
      .map(function(f) {
        return { name: f.name, size: f.size, modifyTime: f.modifyTime };
      });
  }

  /**
   * Download a single file from /DOWNLOAD/ and return its raw Buffer.
   * Callers should use buf.toString('utf8') only for known text files —
   * ZIP/binary files must be saved as Buffers to avoid encoding corruption.
   *
   * @param {string} filename  e.g. 'HMCT.XAOHHZV.DAILY.OUTBB.G0015V00.ZIP'
   * @returns {Buffer}
   */
  async downloadFile(filename) {
    if (!this._client) throw new Error('Not connected — call connect() first.');
    const remotePath = '/DOWNLOAD/' + filename;
    const buf = await this._client.get(remotePath);
    console.log('[sftp] Downloaded ' + filename + ' (' + buf.length + ' bytes)');
    return buf;
  }

  /**
   * Download all files from /DOWNLOAD/, save them locally, and return their contents.
   *
   * @param {string} localDir  Directory to save downloaded files
   * @returns {Array<{name, buffer, content}>}
   *   buffer  — raw Buffer (always present, use for binary files)
   *   content — UTF-8 string (only meaningful for plain-text files like BBAL/ARD)
   */
  async downloadAll(localDir) {
    if (!this._client) throw new Error('Not connected — call connect() first.');
    fs.mkdirSync(localDir, { recursive: true });

    const files = await this.listDownloads();
    const results = [];

    for (const f of files) {
      const buf = await this.downloadFile(f.name);
      const localPath = path.join(localDir, f.name);
      // Always write raw bytes — avoids UTF-8 corruption of ZIP/binary files
      fs.writeFileSync(localPath, buf);
      console.log('[sftp] Saved → ' + localPath);
      const isText = !/\.(zip|gz|Z)$/i.test(f.name);
      results.push({
        name:    f.name,
        buffer:  buf,
        content: isText ? buf.toString('utf8') : '',
      });
    }

    return results;
  }

  /**
   * Delete a file from /DOWNLOAD/ after successful processing.
   * Alberta Health auto-deletes after 15 days, but it's good practice to clean up.
   *
   * @param {string} filename
   */
  async deleteDownload(filename) {
    if (!this._client) throw new Error('Not connected — call connect() first.');
    await this._client.delete('/DOWNLOAD/' + filename);
    console.log('[sftp] Deleted /DOWNLOAD/' + filename);
  }
}

module.exports = { HlinkSftp };
