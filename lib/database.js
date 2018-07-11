'use strict';

const { URL }         = require('url');
const { MongoClient } = require('mongodb');
const { Refreshable } = require('mylife-appmon').tools;

const debug = require('debug')('mylife:appmon:mongo');

module.exports = class Collections extends Refreshable {
  constructor(options) {
    super(options);

    this._url = options.url;
    this._database = new URL(this._url).pathname.substring(1);
    this._runtime = {};

    debug(`url : ${this._url}`);
    debug(`database : ${this._database}`);

    this.collections = [];
    this.stats = {};
  }

  _fetch() {
    if(!this._url || !this._database) {
      return;
    }

    this._refresh();
  }

  async _checkDb() {
    if(!this._runtime.client) {
      this._runtime.db = null;
      this._runtime.client = new MongoClient(this._url);
    }

    if(!this._runtime.client.isConnected()) {
      this._runtime.db = null;
      await this._runtime.client.connect();
    }

    if(!this._runtime.db) {
      this._runtime.db = this._runtime.client.db(this._database);
    }
  }

  async _refresh() {
    try {
      await this._checkDb();

      await Promise.all([
        this._collections(),
        this._stats()
      ]);

    } catch(err) {
      debug(`fetch error : ${err.stack}`);
    }
  }

  async _collections() {
    const result = [];
    for(const collection of await this._runtime.db.collections()) {
      const stats = await collection.stats();
      result.push({
        'Name' : stats.ns,
        'Size' : stats.size,
        'Objects count' : stats.count,
        'Average object size' : stats.avgObjSize,
        'Storage size' : stats.storageSize,
        'Indexes count' : stats.nindexes,
        'Total indexes size' : stats.totalIndexSize,
        // 'Indexes size' : stats.indexSizes
      });
    }
    this.collections = result;
  }

  async _stats() {
    const stats = await this._runtime.db.stats();
    this.stats = {
      'Database name' : stats.db,
      'Collections count' : stats.collections,
      'Views count' : stats.views,
      'Objects count' : stats.objects,
      'Indexes count' : stats.indexes,
      'Average object size' : stats.avgObjSize,
      'Data size' : stats.dataSize,
      'Index size' : stats.indexSize,
      'Storage size' : stats.storageSize,
      'Extends count' : stats.numExtents,
      'FS used size' : stats.fsUsedSize,
      'FS total size' : stats.fsTotalSize
    };
  }
};