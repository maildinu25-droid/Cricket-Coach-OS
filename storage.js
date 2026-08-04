(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CoachBookStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "coachbook";
  const SCHEMA_VERSION = 1;
  const COLLECTIONS = ["sessions", "reflections", "players", "assessments", "matches", "drills"];
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));

  class StorageValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "StorageValidationError";
    }
  }

  function defaults(defaultDrills) {
    return { schemaVersion: SCHEMA_VERSION, sessions: [], reflections: [], players: [], assessments: [], matches: [], drills: Array.isArray(defaultDrills) ? clone(defaultDrills) : [] };
  }

  function validate(value) {
    if (!isObject(value)) throw new StorageValidationError("This backup is not a CoachBook Pro data file.");
    if (value.schemaVersion !== undefined && (!Number.isInteger(value.schemaVersion) || value.schemaVersion < 0 || value.schemaVersion > SCHEMA_VERSION)) {
      throw new StorageValidationError("This backup uses an unsupported CoachBook Pro data version.");
    }
    COLLECTIONS.forEach(key => {
      if (value[key] !== undefined && !Array.isArray(value[key])) {
        throw new StorageValidationError('The "' + key + '" section is invalid.');
      }
    });
  }

  function migrate(value, defaultDrills) {
    validate(value);
    const result = Object.assign({}, clone(value));
    COLLECTIONS.forEach(key => {
      if (result[key] === undefined) result[key] = key === "drills" ? clone(defaultDrills || []) : [];
    });
    result.schemaVersion = SCHEMA_VERSION;
    return result;
  }

  function load(options) {
    const settings = options || {};
    const storage = settings.storage || localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return defaults(settings.defaultDrills);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (error) { throw new StorageValidationError("CoachBook Pro could not read saved browser data. Export a backup before clearing browser data."); }
    const result = migrate(parsed, settings.defaultDrills);
    if (parsed.schemaVersion !== SCHEMA_VERSION || COLLECTIONS.some(key => parsed[key] === undefined)) {
      storage.setItem(STORAGE_KEY, JSON.stringify(result));
    }
    return result;
  }

  function save(database, options) {
    const result = migrate(database, (options || {}).defaultDrills);
    ((options || {}).storage || localStorage).setItem(STORAGE_KEY, JSON.stringify(result));
    return result;
  }

  function importBackupText(text, options) {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (error) { throw new StorageValidationError("The selected file is not valid JSON."); }
    return migrate(parsed, (options || {}).defaultDrills);
  }

  function createBackup(database, options) {
    return JSON.stringify(migrate(database, (options || {}).defaultDrills), null, 2);
  }

  return { STORAGE_KEY, SCHEMA_VERSION, COLLECTIONS, StorageValidationError, defaults, migrate, load, save, importBackupText, createBackup };
});
