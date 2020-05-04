function get_basedir(url) {
  return url.slice(-1) == '/' ? url.slice(0, -1) : url.split('/').slice(0,-1).join('/');
}

basedir = get_basedir(window.location.pathname);

var Pusher_channel_factory = (function() {
  var pusher_instance = null;
  var channels = new Map();
  return {
    get_instance: function(channel_name) {
      if (pusher_instance === null) {
        Pusher.logToConsole = false;
        pusher = new Pusher(
          '1e754324fb908641cba9', {
            cluster: 'eu',
            forceTLS: true
        });
      }
      if (!channels.has(channel_name)) {
          channels.set(channel_name, pusher.subscribe(channel_name));
      }
      return channels.get(channel_name);
    }
  }
})();

// https://stackoverflow.com/a/2117523/5239250
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const app = new Vue({
  el: '#app',
  data: {
    languages: {'de': 'Deutsch', 'it': 'Italiano', 'en': 'English', 'fr': 'Français'},
    list: null,
    sentence: null,
    cipher_id: null,
    description: null,
    description_visible: false,
    editing: false,
    share_key: null,
  },
  mounted() {
    if (localStorage.player_id) { 
      this.player_id = localStorage.player_id;
    } else {
      this.player_id = uuidv4();
      localStorage.setItem('player_id', this.player_id);
    }
    this.get_list();
    if (localStorage.cipher_id) {
      this.select(localStorage.cipher_id);
    }
  },
  methods: {
    get_list: function() {
      axios
        .get(basedir+'/api/', {
          params: {
            action: 'list'
          }
        })
        .then(response => {
          this.list = response.data;
        });
    },
    // there seems to be no garantee that the items in $refs are in the correct order: we cannot pos as the index
    edit: function() {
      this.editing = true;
      this.sentence = '';
    },
    update: function(sentence) {
      this.sentence = new Sentence(sentence);
    },
    select: function(id) {
      this.description_visible = false;
      if (id === null) {
        this.cipher_id = null;
        localStorage.removeItem('cipher_id');
        this.sentence = null;
        this.description = null;
        this.share_key = null;
        localStorage.removeItem('share_key');
        this.editing = false;
        return;
      }
      axios
        .get(basedir+'/api/', {
          params: {
            action: 'get',
            id: id,
          }
        })
        .then(response => {
          localStorage.setItem('cipher_id', id);
          this.cipher_id = id;
          this.title = response.data.title;
          this.sentence = new Sentence(response.data.sentence);
          this.description = response.data.description;
          if (localStorage.share_key) {
            this.share_key = localStorage.share_key;
            this.activate_sharing();
          }
        });
    },
    activate_sharing: function() {
      var pusher_channel = Pusher_channel_factory.get_instance('cipher');
      pusher_channel.bind('typing', function(data) {
        if (data.share_key === app.share_key) {
          app.add_shared_character(data.c, data.i);
        }
      });
    },
    share: function() {
      axios
        .post(basedir+'/api/', {
          action: 'share',
          id: this.cipher_id
        })
        .then(response => {
          this.share_key = response.data.share_key;
          localStorage.setItem('share_key', this.share_key);
        })
    },
    join_shared: function() {
      axios
        .post(basedir+'/api/', {
          action: 'join_shared',
          key: this.share_key
        })
        .then(response => {
          localStorage.setItem('share_key', this.share_key);
          this.select(response.data.id);
          this.activate_sharing();
        })
    },
    create: function(title, language, sentence, description) {
      axios
        .post(basedir+'/api/', {
          action: 'create',
          title: title,
          language: language,
          sentence: sentence,
          description: description
        })
        .then(response => {
            this.get_list();
            this.player_id = response.data['player_id'];
            this.game_id = response.data['game_id'];
            this.sentence = null;
            this.editing = false;
        });
    },
    toggle_description: function() {
      this.description_visible = !this.description_visible;
    },
    add_character(c, i) {
      if (this.share_key !== null) {
        axios
          .post(basedir+'/api/', {
            action: 'typing',
            share_key: this.share_key,
            c: c,
            i: i
          })
          .then(response => {
            // TODO: if i'ts not ok, show a warning?
            // console.log('ok', response.data);
          });
      }
    },
    add_shared_character(c, i) {
      for (character of this.sentence.characters) {
        if (character.i == i) {
          if (character.c !== c) {
            character.c = c;
          }
          break;
        }
      }
    }
  }
});
