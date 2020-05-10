Vue.component('cipher-list', {
  template: `<div>
    <ul class="cipher-list">
      <li v-for="item in paginated_list" v-on:click="select(item.cipher_id)">
        {{item.title}}
        ({{item.language}})
        <a href="#" v-if="item.editable === true" v-on:click="edit(item.cipher_id)">✎</a>
      </li>
    </ul>
    <button type="button" class="page-link" v-if="page > 0" v-on:click="page--"> Previous </button>
    <button type="button" class="page-link" v-if="page <= page_n" v-on:click="page++"> Next </button>
  </div>`,
  props: {
    list: Array
  },
  data: function() {
    return {
      page: 0,
      page_n: 0,
      per_page: 10
    }
  },
  computed: {
    paginated_list() {
      if (this.list === null) {
        return [];
      }
      start = this.page * this.per_page;
      list = this.list.slice(start, start + this.per_page);
      page_n = Math.trunc(list.length / this.per_page);
      return list;
    }
  },
  methods: {
    edit: function() {
      this.$emit('edit', '');
    },
    select: function(cipher_id) {
      this.$emit('select', cipher_id);
    }
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

Vue.component('editor', {
  template: `<div class="creation">
    <input type="text" v-model="title" placeholder="Title" required>
    <select v-model="language" required>
      <option v-for="(value, key) in languages" v-bind:value="key">
        {{value}}
      </option>
    </select><br>
    <textarea v-model="sentence"></textarea required><br>
    <input type="text" v-model="description" placeholder="Description" class="description"><br>
    <input type="button" value="Add" :disabled="title === '' || language === null || sentence === ''" v-on:click="create" placeholder="Description">
  </div>`,
  props: {
    languages: Object
  },
  data: function() {
    return {
      sentence: null,
      title: null,
      description: null,
      language: null,
    }
  },
  watch: {
    sentence: {
      handler(val) {
        this.$emit('update', this.sentence);
      }
    }
  },
  methods: {
    create: function() {
      this.$emit('create', this.title, this.language, this.sentence, this.description);
    }
  }
});

Vue.component('ciphered-sentence', {
  template: `<div>
    <div v-for="(character, i) in sentence.characters" class="character">
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
