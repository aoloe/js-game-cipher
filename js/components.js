Vue.component('cipher-list', {
  template: `<div>
		<p>
    <select v-model="filter" required>
      <option value="all">All</option>
      <option value="mine">Mine</option>
      <option v-for="(value, key) in data_store.languages" v-bind:value="key">
        {{value}}
      </option>
    </select><br>
		</p>
    <ul class="cipher-list">
      <li v-for="item in paginated_list">
        <a-link href="play" :params="{cipher_id: item.cipher_id}" class = "label">
        {{item.title}}
        ({{item.language}})
        </a-link>
        <span v-if="item.work_in_progress" title="Work in progress">🚧</span>
        <span v-for="(value, key) in active_categories(item.category, item.title)" v-bind:title="value.legend">{{ value.symbol }}</span>
        <a-link v-if="item.editable" href="edit" :params="{cipher_id: item.cipher_id}">✎</a-link>
        <a v-else-if="admin" v-on:click="impersonate(item.cipher_id)" title="Manage this Cipher's user">👤</a>
      </li>
    </ul>
    <button type="button" class="page-link" v-if="page > 0" v-on:click="page--"> Previous </button>
    <button type="button" class="page-link" v-if="page < page_n" v-on:click="page++"> Next </button>
  </div>`,
  props: {
  },
  data: function() {
    return {
      list: [],
      admin: false,
      page: 0,
      page_n: 0,
      per_page: 10,
      filter: 'all',
      data_store: Data_store
    }
  },
  mounted() {
    if (localStorage.cipher_filter) {
      this.filter = localStorage.cipher_filter;
    }
    this.get_list();
  },
  watch: {
    filter: function(new_value) {
      if (this.filter === 'all') {
        localStorage.removeItem('cipher_filter');
      } else {
        localStorage.setItem('cipher_filter', this.filter);
      }
    }
  },
  computed: {
    paginated_list() {
      if (this.list === null) {
        return [];
      }
      if (this.filter === 'all') {
        list = this.list.slice();
      } else if (this.filter === 'mine') {
        list = this.list.filter(f => f.editable === true);
      } else {
        list = this.list.filter(f => f.language === this.filter);
      }
      start = this.page * this.per_page;
      this.page_n = Math.ceil(list.length / this.per_page);
      list = list.slice(start, start + this.per_page);
      return list;
    }
  },
  methods: {
    get_list: function() {
      axios
        .get(basedir+'/api/', {
          params: {
            action: 'list',
            author: this.data_store.player_id
          }
        })
        .then(response => {
          this.admin = response.data.admin;
          this.list = response.data.list;
        });
    },
    active_categories(item_categories, title) {
      result = {};
      for (let [key, value] of Object.entries(this.data_store.categories)) {
        if (item_categories && key in item_categories && item_categories[key]) {
          result[key] = value;
        }
      }
      return result;
    },
    impersonate: function(cipher_id) {
      axios
        .get(basedir+'/api/', {
          params: {
            action: 'user_by_cipher',
            id: cipher_id,
            admin: this.data_store.player_id
          }
        })
        .then(response => {
          // TODO: not sure it's a good itea to write it directly...
          this.data_store.player_id = response.data.user_id
          this.get_list();
        });
    },
    select: function(cipher_id) {
      this.$emit('select', cipher_id);
    }
  }
});
Vue.component('player', {
  template: `<div class="player">
    <h2>{{title}}</h2>
    <ciphered-sentence v-if="sentence !== null" :sentence="sentence" v-on:add_character="add_character">
    </ciphered-sentence>

    <p v-if="description !== null && description !== ''"><a href="#" v-on:click="toggle_description()">+ Description</a></p>
    <p v-if="description_visible">{{description}}</p>
    <p v-if="data_store.share_key === null">
    <input type="button" v-on:click="share" value="Multiplayer">
    </p>
    <p v-else>
    Send this code to other players to play this game with them:<br>
    <!--
    <a v-bind:href="link_multiplayer" class="share_key">{{data_store.share_key}}</a>
    -->
    <span class="share_key">{{data_store.share_key}}</span>

    </p>
    <!--
    <p><span class="share">&lt;</span><a v-bind:href="link_here">Share this game</a></p>
    -->
  </div>`,
  props: {
    cipher_id: {
      required: true,
      validator: p => typeof p === 'string' || p === null
    }
  },
  data: function() {
    return {
      sentence: null,
      title: null,
      description: null,
      description_visible: false,
      data_store: Data_store
    }
  },
  computed: {
    link_multiplayer() {
      const url = new URL(document.location);
      return url.protocol+'//'+url.hostname+url.pathname+'?share='+this.data_store.share_key;
    },
    link_here() {
      const url = new URL(document.location);
      return url.protocol+'//'+url.hostname+url.pathname+'?id='+this.cipher_id;
    }
  },
  mounted() {
    localStorage.setItem('cipher_id', this.cipher_id);
    if (localStorage.cipher_share_key) {
      this.data_store.share_key = localStorage.cipher_share_key;
    }
    axios
      .get(basedir+'/api/', {
        params: {
          action: 'get',
          id: this.cipher_id,
          author: this.data_store.player_id
        }
      })
      .then(response => {
        this.title = response.data.title;
        this.sentence = Sentence.from_string(response.data.sentence);
        this.description = response.data.description;
        if (this.data_store.share_key !== null) {
          this.activate_sharing();
        }
      });
  },
  destroyed() {
    localStorage.removeItem('cipher_id');
    this.data_store.share_key = null;
    localStorage.removeItem('cipher_share_key');
  },
  methods: {
    toggle_description: function() {
      this.description_visible = !this.description_visible;
    },
    add_character(c, i) {
      if (this.data_store.share_key !== null) {
        axios
          .post(basedir+'/api/', {
            action: 'typing',
            share_key: this.data_store.share_key,
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
    },
    activate_sharing: function() {
      var pusher_channel = Cipher.pusher_channel_factory.get_instance('cipher');
      pusher_channel.bind('typing', function(data) {
        if (data.share_key === this.data_store.share_key) {
          this.add_shared_character(data.c, data.i);
        }
      }.bind(this));
    },
    share: function() {
      axios
        .post(basedir+'/api/', {
          action: 'share',
          id: this.cipher_id
        })
        .then(response => {
          this.data_store.share_key = response.data.share_key;
          localStorage.setItem('share_key', this.data_store.share_key);
        })
    },
  }
});

Vue.component('editor', {
  template: `<div class="creation">
    <input type="text" v-model="title" placeholder="Title" required>
    <select v-model="language" required>
      <option v-for="(value, key) in data_store.languages" v-bind:value="key">
        {{value}}
      </option>
    </select>
    <template v-for="(value, key) in valid_categories">
      <input type="checkbox" :id="key" v-model="category[key]">
      <label :for="key" :title="value.legend">{{ value.symbol }}</label>
    </template>
    <br>
    <textarea v-model="sentence"></textarea required><br>
    <input type="text" v-model="description" placeholder="Description" class="description"><br>
    <div>
      <template v-if="cipher_id">
        <button :disabled="title === '' || language === null || sentence === ''" v-on:click="save">Save</button>
        <button v-on:click="remove">Delete</button>
      </template>
      <button v-else :disabled="title === '' || language === null || sentence === ''" v-on:click="create">Create</button>
      <input type="checkbox" id="wip" v-model="work_in_progress"><label for="wip" title="Work in progress">🚧</label>
      <ciphered-sentence v-if="sentence !== null" :sentence="sentence_object">
      </ciphered-sentence>
    </div>
  </div>`,
  props: {
    cipher_id: {
      required: true,
      validator: p => typeof p === 'string' || p === null
    }
  },
  data: function() {
    return {
      sentence: null,
      title: null,
      description: null,
      language: null,
      category: {hard: false, personal: false, kids: false},
      work_in_progress: null,
      data_store: Data_store
    }
  },
  mounted() {
    if (this.cipher_id !== null) {
      localStorage.setItem('cipher_id', this.cipher_id);
      axios
        .get(basedir+'/api/', {
          params: {
            action: 'get',
            id: this.cipher_id,
            raw: true,
            author: this.data_store.player_id
          }
        })
        .then(response => {
          this.language = response.data.language;
          this.title = response.data.title;
          this.sentence = response.data.sentence;
          this.description = response.data.description;
          for (k in response.data.category) {
            this.category[k] = response.data.category[k];
          }
          this.work_in_progress = response.data.work_in_progress;
        });
    } else {
      if (localStorage.cipher_editor_sentence) {
        this.sentence = localStorage.cipher_editor_sentence;
      }
    }
  },
  destroyed() {
    localStorage.removeItem('cipher_id');
    localStorage.removeItem('cipher_editor_sentence');
  },
  watch: {
    sentence: {
      handler(val) {
        this.sentence_object = Sentence.from_string(this.sentence)
      }
    }
  },
  computed: {
    valid_categories() {
      categories = {};
      for (let [key, value] of Object.entries(this.data_store.categories)) {
        if (key in this.category) {
          categories[key] = value;
          categories[key].active = this.category[key];
        }
      }
      return categories;
    }
  },
  methods: {
    create: function() {
      axios
        .post(basedir+'/api/', {
          action: 'create',
          title: this.title,
          language: this.language,
          sentence: this.sentence,
          category: this.category,
          work_in_progress: this.work_in_progress,
          description: this.description,
          author: this.data_store.player_id
        })
        .then(response => {
            this.$root.go('list');
        });
    },
    save: function() {
      localStorage.removeItem('cipher_editor_words');
      axios
        .post(basedir+'/api/', {
          action: 'update',
          id: this.cipher_id,
          title: this.title,
          sentence: this.sentence,
          language: this.language,
          category: this.category,
          work_in_progress: this.work_in_progress,
          description: this.description,
          author: this.data_store.player_id
        })
        .then(response => {
            this.$root.go('list');
        });
    },
    remove: function() {
      localStorage.removeItem('cipher_editor_words');
      axios
        .post(basedir+'/api/', {
          action: 'delete',
          id: this.cipher_id,
          author: this.data_store.player_id
        })
        .then(response => {
            this.$root.go('list');
        });
    },
  }
});

Vue.component('character', {
  template: `<input type="text" v-model="c" minlength="1" maxlength="1" :pos="pos" :ref="'cipher-i-'+pos.toString()" v-on:keydown="keyfilter" v-on:keyup="keymonitor">`,
  props: {
    character: Object,
    pos: Number,
    transformations: Array
  },
  computed: {
    c: {
      get() {
        let c = this.character.c;
        if (c === null || c === '') {
          return '';
        }
        if (typeof this.transformations[this.pos] !== 'undefined') {
          let t = this.transformations[this.pos];
          if (t.hasOwnProperty('diacritics')) {
            let l_d = Character.letter_to_diacritics.get(t.diacritics);
            if (l_d.has(c)) {
              c = l_d.get(c);
            }
          }
          if (t.hasOwnProperty('uppercase')) {
            c = c.toUpperCase();
          }
          return c;
        } else {
          return c;
        }
      },
      set(val) {
        let old_c = this.character.c;
        this.character.c = val;
        this.$emit('add_character', this.character, old_c);
      }
    }
  },
  methods: {
    keyfilter: function(e) {
       if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
         e.preventDefault();
       }
    },
    keymonitor: function(e) {
      if (e.key == ' ' || e.key == 'ArrowRight') {
        let pos = Number(e.srcElement.attributes.pos.value);
        this.$emit('next_focus', pos);
      } else if (e.key == 'ArrowLeft') {
        let pos = Number(e.srcElement.attributes.pos.value);
        this.$emit('prev_focus', pos);
      }
    }
  }
});


Vue.component('ciphered-sentence', {
  template: `<div>
    <div v-for="(character, i) in sentence.characters" class="character" v-bind:class="{'new-line': character.c === String.fromCharCode(10)}">
      <template v-if="character.i !== 0">
      <character ref="characters" :character="character" :pos="i" :transformations="sentence.transformations" v-on:next_focus="next_focus" v-on:prev_focus="prev_focus" v-on:add_character="add_character"></character>
      <div class="cipher">{{character.i}}</div>
      </template>
      <template v-else>
      <div v-if="character.c === ' '" class="space"> </div>
      <div v-else class="hint">{{character.c}}</div>
      </template>
    </div>
  </div>`,
  props: {
    sentence: Object
  },
  data: function() {
    return {
    }
  },
  methods: {
    prev_focus: function(pos) {
      let c = null;
      for (character of this.$refs.characters) {
        if (character.pos < pos && (c === null || c.pos < pos)) {
          c = character
        }
      }
      if (c !== null) {
        c.$el.focus();
      }
    },
    next_focus: function(pos) {
      let c = null;
      for (character of this.$refs.characters) {
        if (character.pos > pos && (c === null || c.pos < pos)) {
          c = character
        }
      }
      if (c !== null) {
        c.$el.focus();
      }
    },
    add_character(character, old_c) {
      if (Character.is_uppercase(character.c)) {
        character.c = character.c.toLowerCase();
      }
      if (Character.diacritics.has(character.c)) {
        character.c = Character.diacritics.get(character.c)[1];
      }

      if (this.sentence.has(character)) {
        character.c = old_c;
      } else {
        this.$emit('add_character', character.c, character.i);
      }
    }
  }
});

Vue.component('join-shared', {
  template: `<div>
    <h2>Join a multi-player cipher</h2>
    <p>Paste here the invitation code you got: <input type="text" v-model="share_key" v-on:keyup.enter="join_shared"> <input type="button" value="Join" v-on:click="join_shared"></p>
  </div>`,
  props: {
  },
  data: function() {
    return {
      share_key: null,
      data_store: Data_store
    }
  },
  methods: {
    join_shared: function() {
      axios
        .post(basedir+'/api/', {
          action: 'join_shared',
          key: this.share_key
        })
        .then(response => {
          this.data_store.share_key = this.share_key;
          this.$root.go('play', {'cipher_id': response.data.id});
        })
    }
  }
});

// based on https://github.com/chrisvfritz/vue-2.0-simple-routing-example/blob/master/src/components/VLink.vue
// this version does not push the state to the history
Vue.component('a-link', {
  template: `<a
        v-bind:href="href"
        v-bind:class="{ active: isActive }"
        v-on:click="go"
      >
        <slot></slot>
      </a>`,
  props: {
    href: {
      type:String,
      required: true
    },
    params: {
      type: Object,
      default: {}
    }
  },
  computed: {
    isActive () {
      // TODO: can we have a use for this?
      // return this.href === this.$root.a_link_target
      return false;
    }
  },
  methods: {
    go(event) {
      event.preventDefault()
      let vm = this.$parent;
      while (vm) {
        vm.$emit('a_link_event', this.href, this.params);
        vm = vm.$parent;
      }
    }
  }
});
