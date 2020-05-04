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

Character = function(c, i) {
  this.c = c;
  this.i = i;
  this.hint = i === 0;
  this.transform = null;
}
Character.in_clear = new Set([' ', ',', '!', '?', '.', '(', ')', ';', ':', '%', '/', '*', '"', '«', '»', '“', '”', '-']);
// map of diacritics: â → [^, a]
Character.diacritics = new Map([
  ['à', ['`', 'a']], ['á', ['\'', 'a']],['â', ['^', 'a']], ['ä', ['"', 'a']],
  ['è', ['`', 'e']], ['é', ['\'', 'e']],['ê', ['^', 'e']], ['ë', ['"', 'i']],
  ['ì', ['`', 'i']], ['í', ['\'', 'i']],['î', ['^', 'i']], ['ï', ['"', 'i']],
  ['ò', ['`', 'o']], ['ó', ['\'', 'o']],['ô', ['^', 'o']], ['ö', ['"', 'o']],
  ['ù', ['`', 'u']], ['ú', ['\'', 'u']],['û', ['^', 'u']], ['ü', ['"', 'u']],
  ['ç', [',', 'c']], ['ñ', ['~', 'n']],
]);
// reversed map of diactritics: ^ → a → â / ^ → o → ô / ...
Character.letter_to_diacritics = new Map();
for (let item of Character.diacritics) {
  let l_t_d = Character.letter_to_diacritics.get(item[1][0]);
  if (typeof(l_t_d) === 'undefined') {
    Character.letter_to_diacritics.set(item[1][0], new Map([[item[1][1], item[0]]]));
  } else {
    l_t_d.set(item[1][1], item[0]);
  }
}
Character.is_uppercase = function(c) {
  return c === c.toUpperCase();
}
Character.is_clear = function(c) {
    return Character.in_clear.has(c);
}
Sentence = function(sentence) {
    this.characters = [];
    this.transformations = [];

    let characters = new Map();

    let i = 1;
    let hint = false;
    let n_dashes = 0;
    for (let j = 0; j < sentence.length; j++) {
      let c = sentence[j];
      if (c === '_') {
        hint = !hint;
        n_dashes++;
        continue;
      } else if (hint || Character.is_clear(c)) {
        this.characters.push(new Character(c, 0));
      } else {
        let t = {};
        if (Character.is_uppercase(c)) {
          c = c.toLowerCase();
          t.uppercase = true;
        }
        if (Character.diacritics.has(c)) {
          let d = Character.diacritics.get(c);
          c = d[1];
          t.diacritics = d[0];
        }
        if (Object.keys(t).length > 0) {
          this.transformations[j - n_dashes] = t;
        }
        if (!characters.has(c)) {
          characters.set(c, new Character(null, i));
          i++;
        }
        this.characters.push(characters.get(c));
      }
    }
}
Sentence.prototype.has = function(c) {
  if (c.c === null || c.c === '') {
    return false;
  }
  for (character of this.characters) {
    if ( character.i > 0 && character.c === c.c && character.i !== c.i) {
      return true;
    }
  }
  return false;
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
