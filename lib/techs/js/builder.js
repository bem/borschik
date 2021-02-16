const SourceMapGenerator = require('source-map').SourceMapGenerator;
/**
 * Tracks line/column offsets of the file.
 */
function Offset() {
    this.line = 0;
    this.column = 0;
}


class Builder {
    /**
     * @param {Boolean} [options.generateSourceMap=false]
     * @param {String} [options.sourceMapFilename]
     * @param {String} [options.sourceMapSourceRoot]
     */
    constructor(options) {
        options = options || {};

        this.generateSourceMap = !!options.generateSourceMap;
        this.sourceMapFilename = options.sourceMapFilename;
        this.sourceMapSourceRoot = options.sourceMapSourceRoot;
        this.contentParts = [];

        /**
         * Offsets of the content.
         * @type {Offset}
         */
        this.offset = new Offset();

        /**
         * Offsets of the consumed files.
         * @type {Object.<String, Offset>}
         */
        this.fileOffsets = {};

        this.smg = this.generateSourceMap && new SourceMapGenerator({
            file: this.sourceMapFilename || null,
            sourceRoot: this.sourceMapSourceRoot || null
        });
    }

    /**
     * @param {String} filename File name for source map.
     * @param {BaseNode} node
     * @param {Mappings[]} [mappings]
     * @param {Boolean} [resetFile] Reset tracking of the original offsets for the given file.
     */
    append(filename, node, mappings, resetFile) {
        this.contentParts.push(node.getContent());

        if (!this.generateSourceMap) {
            return;
        }

        const lines = node.getLines();
        if (!lines.length) {
            return;
        }

        if (mappings) {
            this._addMappings(mappings);
        } else {
            // Reset offset in order to track multiple includes of the same file correctly.
            let offset = !resetFile && this.fileOffsets[filename];
            if (!offset) {
                offset = this.fileOffsets[filename] = new Offset();
            }

            // If freezeOriginalLine is true, then the original line offsets in the result
            // mappings will be the same for all given lines and will be equal to the
            // previous original line offset.
            const freezeOriginalLine = node.ignoreMappings();
            this._addMappingsForLines(filename, offset, lines, freezeOriginalLine);
            if (!freezeOriginalLine) {
                this._updateOffsets(offset, lines);
            }
        }

        this._updateOffsets(this.offset, lines);
    }

    _addMappings(mappings) {
        const smg = this.smg;
        const offset = this.offset;

        mappings.forEach(function(m) {
            smg.addMapping({
                generated: {
                    line: offset.line + m.generatedLine,
                    column: (m.generatedLine === 1 ? offset.column : 0) + m.generatedColumn
                },
                original: m.originalLine && {
                    line: m.originalLine,
                    column: m.originalColumn
                },
                source: m.source,
                name: m.name
            });
        });
    }

    _addMappingsForLines(filename, offset, lines, freezeOriginalLine) {
        const smg = this.smg;
        const contentOffset = this.offset;
        const baseOriginalLineOffset = offset.line + (freezeOriginalLine ? 1 : 0);

        for (let i = 1, l = lines.length; i <= l; ++i) {
            // Trailing empty line should be ignored; it will be added when
            // the next node of the file will be appended (if any).
            if (i === l && lines[i - 1] === '') {
                continue;
            }

            smg.addMapping({
                generated: {
                    line: contentOffset.line + i,
                    column: (i === 1 ? contentOffset.column : 0)
                },
                original: {
                    line: baseOriginalLineOffset + (freezeOriginalLine ? 0 : i),
                    column: (i === 1 ? offset.column : 0)
                },
                source: filename
            });
        }
    }

    _updateOffsets(offset, lines) {
        const len = lines.length;

        offset.line += len - 1;
        offset.column = (len > 1 ? 0 : offset.column) + lines[len - 1].length;
    }

    /**
     * @returns {String}
     */
    getContent() {
        return this.contentParts.join('');
    }

    /**
     * @returns {String|null}
     */
    getSourceMap() {
        return this.smg ? this.smg.toString() : null;
    }
}

module.exports = Builder;
