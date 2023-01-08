import { CACHE_EXPIRATION_TIME_MS, RESOURCE_CACHE_KEY } from '@/constants';
import $ from '@/core/app';

class ResourceCache {
    constructor(expires) {
        this.expires = expires;
        if (!$.read(RESOURCE_CACHE_KEY)) {
            $.write('{}', RESOURCE_CACHE_KEY);
        }
        this.resourceCache = JSON.parse($.read(RESOURCE_CACHE_KEY));
        this._cleanup();
    }

    _cleanup() {
        // clear obsolete cached resource
        let clear = false;
        Object.entries(this.resourceCache).forEach((entry) => {
            let [id, obj] = entry;
            if (typeof obj == 'number') {
                // migrate
                this.resourceCache[id] = {};
                this.resourceCache[id].time = obj;
                this.resourceCache[id].data = $.read(`#${id}`);
                obj = { time: obj };
                $.delete(`#${id}`);
                clear = true;
            }
            if (new Date().getTime() - obj.time > this.expires) {
                delete this.resourceCache[id];
                clear = true;
            }
        });
        if (clear) this._persist();
    }

    revokeAll() {
        this.resourceCache = {};
        this._persist();
    }

    _persist() {
        $.write(JSON.stringify(this.resourceCache), RESOURCE_CACHE_KEY);
    }

    get(id) {
        const updated = this.resourceCache[id].time;
        if (updated && new Date().getTime() - updated <= this.expires) {
            return this.resourceCache[id].data;
        }
        return null;
    }

    set(id, value) {
        this.resourceCache[id] = {};
        this.resourceCache[id].time = new Date().getTime();
        this.resourceCache[id].data = value;
        this._persist();
    }
}

export default new ResourceCache(CACHE_EXPIRATION_TIME_MS);
