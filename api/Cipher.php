<?php

class Cipher
{
    var $db = null;

    function __construct($db_name = 'db/cipher.db') {
        // TODO: move the db outside of httpdocs
        $this->db = new SQLite3($db_name);
        $this->db->query("CREATE TABLE IF NOT EXISTS sentence (
                sentence_id INTEGER PRIMARY KEY,
                sentence_hash TEXT,
                title TEXT,
                language TEXT,
                sentence TEXT,
                description TEXT,
                author TEXT
            );
        ");
        $this->db->query("CREATE TABLE IF NOT EXISTS share (
                share_id INTEGER PRIMARY KEY,
                sentence_id INTEGER,
                share_hash TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }

    function get_list($author = null) {
        $list = [];
        $db_result = $this->db->query('SELECT
            sentence_hash, title, language, author
            FROM sentence');
        while ($row = $db_result->fetchArray(SQLITE3_NUM)) {
            $list[] = [
                'hash' => $row[0],
                'title' => $row[1],
                'language' => $row[2],
                'editable' => $row[3] === $author
            ];
        }
        return $list;
    }

    function get($hash) {
        $stmt = $this->db->prepare('SELECT
            sentence_hash, title, sentence, description
            FROM sentence
            WHERE sentence_hash = :hash');
        $stmt->bindValue(':hash', $hash);
        $db_result = $stmt->execute();
        $row = $db_result->fetchArray(SQLITE3_NUM);
        return $row ? $row : [null, null, null, null];
    }

    public function add($title, $language, $sentence, $description, $author) {
        $sentence_hash = base64_encode(openssl_random_pseudo_bytes(16));
        $stmt = $this->db->prepare('INSERT INTO sentence
            (sentence_hash, title, language, sentence, description, author)
            VALUES (:sentence_hash, :title, :language, :sentence, :description, :author)');
        $stmt->bindValue(':sentence_hash', $sentence_hash, SQLITE3_TEXT);
        $stmt->bindValue(':title', $title, SQLITE3_TEXT);
        $stmt->bindValue(':language', $language, SQLITE3_TEXT);
        $stmt->bindValue(':sentence', $sentence, SQLITE3_TEXT);
        $stmt->bindValue(':description', $description, SQLITE3_TEXT);
        $stmt->bindValue(':author', $author, SQLITE3_TEXT);
        $stmt->execute();
        return [$this->db->lastInsertRowid(), $sentence_hash];
    }

    // https://stackoverflow.com/a/2117523/5239250
    // (it would be good to use random_bytes(),
    // see https://stackoverflow.com/questions/2040240
    private static function uuidv4() {
        $result = preg_replace_callback('/[018]/',
            function($matches) {
                $c = $matches[0];
                return base_convert($c ^ random_int(0, 255) & 15 >> $c / 4, 10, 16);
                },
                '10000000-1000-4000-8000-100000000000');
        print_r($result, 1);
        return $result;
    }

    public function share(string $sentence_hash) :?string {
        $share_hash = self::uuidv4();
        $stmt = $this->db->prepare('INSERT INTO share
            (sentence_id, share_hash)
            SELECT  sentence_id, :share_hash FROM sentence WHERE sentence_hash = :sentence_hash');
        if ($stmt !== false) {
            $stmt->bindValue(':share_hash', $share_hash, SQLITE3_TEXT);
            $stmt->bindValue(':sentence_hash', $sentence_hash, SQLITE3_TEXT);
            $stmt->execute();
            return $share_hash;
        }
        return null;
    }

    function get_shared_game($hash) {
        $stmt = $this->db->prepare('SELECT
            sentence_hash
            FROM sentence
            JOIN share ON
                share.sentence_id = sentence.sentence_id
            WHERE share_hash = :hash');
        $stmt->bindValue(':hash', $hash);
        $db_result = $stmt->execute();
        $row = $db_result->fetchArray(SQLITE3_NUM);
        return $row ? $row[0] : null;
    }
}
