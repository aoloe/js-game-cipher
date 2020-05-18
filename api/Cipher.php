<?php

class Cipher
{
    static $db_version = 2;
    var $db = null;

    function __construct($db_file = 'db/cipher.db') {
        // TODO: for the future, just set the version to 1 at the beginnings and if the pragma is 0 do an install
        $install = !file_exists($db_file);

        $this->db = new SQLite3($db_file);

        if ($install) {
            $this->install_db();
        } else {
            $db_version = $this->db->querySingle('PRAGMA user_version');
            if ($db_version < self::$db_version) {
                $this->update_db($db_file);
            }
        }
    }

    function get_list($author = null) {
        $list = [];
        $db_result = $this->db->query('SELECT
            sentence_hash, title, language, category, work_in_progress, author
            FROM sentence
            ORDER BY sentence_id DESC');
        while ($row = $db_result->fetchArray(SQLITE3_NUM)) {
            if ($row[4] && ($author !== $row[5])) {
                continue;
            }
            $list[] = [
                'hash' => $row[0],
                'title' => $row[1],
                'language' => $row[2],
                'category' => json_decode($row[3], true),
                'work_in_progress' => $row[4],
                'editable' => $row[5] === $author
            ];
        }
        return $list;
    }

    function get($hash) {
        $stmt = $this->db->prepare('SELECT
            sentence_hash, title, sentence, language, category, work_in_progress, description, author
            FROM sentence
            WHERE sentence_hash = :hash');
        $stmt->bindValue(':hash', $hash);
        $db_result = $stmt->execute();
        $row = $db_result->fetchArray(SQLITE3_NUM);
        return $row ?
            [$row[0], $row[1], $row[2], $row[3],
                json_decode($row[4], true),
                $row[5], $row[6], $row[7]]:
            array_fill(0, 8, null);
    }

    public function add($title, $language, $sentence, $category, $work_in_progress, $description, $author) {
        $sentence_hash = base64_encode(openssl_random_pseudo_bytes(16));
        $stmt = $this->db->prepare('INSERT INTO sentence
            (sentence_hash, title, language, sentence, category, work_in_progress, description, author)
            VALUES (:sentence_hash, :title, :language, :sentence, :category, :work_in_progress, :description, :author)');
        $stmt->bindValue(':sentence_hash', $sentence_hash, SQLITE3_TEXT);
        $stmt->bindValue(':title', $title, SQLITE3_TEXT);
        $stmt->bindValue(':language', $language, SQLITE3_TEXT);
        $stmt->bindValue(':sentence', $sentence, SQLITE3_TEXT);
        $stmt->bindValue(':category', json_encode($category), SQLITE3_TEXT);
        $stmt->bindValue(':work_in_progress', $work_in_progress, SQLITE3_INTEGER);
        $stmt->bindValue(':description', $description, SQLITE3_TEXT);
        $stmt->bindValue(':author', $author, SQLITE3_TEXT);
        $stmt->execute();
        return [$this->db->lastInsertRowid(), $sentence_hash];
    }

    public function set($cipher_hash, $title, $language, $sentence, $category, $work_in_progress, $description, $author) {
        $sentence_hash = base64_encode(openssl_random_pseudo_bytes(16));
        $stmt = $this->db->prepare('UPDATE sentence SET
            (title, language, sentence, category, work_in_progress, description) =
                (:title, :language, :sentence, :category, :work_in_progress, :description)
            WHERE sentence_hash = :sentence_hash AND
                author = :author');
        $stmt->bindValue(':title', $title, SQLITE3_TEXT);
        $stmt->bindValue(':language', $language, SQLITE3_TEXT);
        $stmt->bindValue(':sentence', $sentence, SQLITE3_TEXT);
        $stmt->bindValue(':category', json_encode($category), SQLITE3_TEXT);
        $stmt->bindValue(':work_in_progress', $work_in_progress, SQLITE3_INTEGER);
        $stmt->bindValue(':description', $description, SQLITE3_TEXT);
        $stmt->bindValue(':sentence_hash', $cipher_hash, SQLITE3_TEXT);
        $stmt->bindValue(':author', $author, SQLITE3_TEXT);
        $result = $stmt->execute();
        return [$this->db->lastInsertRowid(), $sentence_hash];
    }
    //
    /// @return null on success, the original hash otherwise
    public function delete($cipher_hash, $author) {
        $stmt = $this->db->prepare('DELETE FROM sentence
            WHERE sentence_hash = :sentence_hash AND
                author = :author');
        $stmt->bindValue(':sentence_hash', $cipher_hash, SQLITE3_TEXT);
        $stmt->bindValue(':author', $author, SQLITE3_TEXT);
        $stmt->execute();
        // return ['hash' => $this->db->changes() === 1 ? null : $sentence_hash];
        return ['hash' => $this->db->changes() === 1 ? null : $sentence_hash];
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
        return $result;
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

    function install_db() {
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
    function update_db($db_file) {
        $backup = $db_file.'~'.date('Ymd-His');
        exec("sqlite3 '$db_file' '.backup '".$backup."''");

        // $db_version = $db->exec('PRAGMA user_version=0');
        $db_version = $this->db->querySingle('PRAGMA user_version');

        if ($db_version < 2) {
            $this->db->exec('
                ALTER TABLE sentence
                    ADD category TEXT DEFAULT "{}"
            ');
            $this->db->exec('
                ALTER TABLE sentence
                    ADD work_in_progress BOOLEAN
            ');
        }
        $this->db->exec('PRAGMA user_version='.self::$db_version);
    }
}
