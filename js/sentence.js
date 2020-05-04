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
