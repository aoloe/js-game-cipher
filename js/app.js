basedir = Cipher.get_basedir(window.location.pathname);

const modes = [
  'list',
  'play',
  'edit'
];

// https://vuejs.org/v2/guide/state-management.html#Simple-State-Management-from-Scratch
var Data_store = {
  player_id: null,
  share_key: null,
  languages: {'de': 'Deutsch', 'it': 'Italiano', 'en': 'English', 'fr': 'Français'},
  categories: {
    // general: {symbol: ' ', legend: 'General'},
    hard: {symbol: '💪', legend: 'Hard'},
    personal: {symbol: '👪', legend: 'Personal'},
    kids: {symbol: '🐣', legend: 'For Kids'},
  }
  /*
  state: {
  },
  */
  /*
  set: function(key, value) {
    if (typeof(this.state[key]) !== 'undefined') {
      this[key] = value;
    } else {
      console.error('go: ' + key + ' is not in the store');
    }
  },
  get: function(key, value) {
    if (typeof(this.state[key]) !== 'undefined') {
      return this[key];
    } else {
      console.error('go: ' + key + ' is not in the store');
      return null;
    }
  }
  */
};

const app = new Vue({
  el: '#app',
  data: {
    mode: null,
    cipher_id: null,
    data_store: Data_store
  },
  mounted() {
    // TODO: migration from old player_id... remove this after some time (ale/20200517)
    if (localStorage.player_id) {
      localStorage.setItem('cipher_player_id', localStorage.player_id);
      localStorage.removeItem('player_id');
    }
    if (localStorage.cipher_player_id) {
      this.data_store.player_id = localStorage.cipher_player_id;
    } else {
      this.data_store.player_id = Cipher.uuidv4();
      localStorage.setItem('cipher_player_id', this.data_store.player_id);
    }
    if (localStorage.cipher_share_key) {
      this.data_store.share = localStorage.cipher_share_key;
      localStorage.removeItem('cipher_share_key');
      this.mode = 'play';
      return;
    }
    if (localStorage.cipher_id) {
      this.cipher_id = localStorage.cipher_id;
    }
    if (localStorage.cipher_mode) {
      this.mode = localStorage.cipher_mode;
    }
    const url = new URL(document.location);
    const params = url.searchParams;
    const redirection = url.protocol+'//'+url.hostname+url.pathname;
    if (params.has('id')) {
      const id = params.get('id');
      localStorage.removeItem('cipher_id');
      localStorage.removeItem('mode');
      // this.mode = 'list';
      // this.data_store.cipher_id = id;
      this.go('play', {'cipher_id': id});
    } else if (params.has('share')) {
      const id = params.get('share');
      localStorage.removeItem('cipher_id');
      localStorage.removeItem('mode');
      this.data_store.cipher_id = null;
      localStorage.cipher_share_key = id;
      this.go('list');
      // localStorage.setItem('cipher_share_key', id);
		}
    if (Array.from(params).length > 0) {
      // window.location.replace(redirection);
      window.history.replaceState({}, document.title, redirection)
    }

  },
  methods: {
    go: function(href, params = {}) {
      if (modes.includes(href)) {
        for (let [key, param] of Object.entries(params)) {
          if (typeof(this[key]) !== 'undefined') {
            this[key] = param;
          } else {
            console.error('go: ' + key + ' is not defined');
          }
        }
        this.mode = href;
        localStorage.setItem('cipher_mode', this.mode);
      }
    },
  }
});
