'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./../git");
class GitStashParser {
    static parse(data, repoPath) {
        const entries = this._parseEntries(data);
        if (entries === undefined)
            return undefined;
        const commits = new Map();
        for (let i = 0, len = entries.length; i < len; i++) {
            const entry = entries[i];
            let commit = commits.get(entry.sha);
            if (commit === undefined) {
                commit = new git_1.GitStashCommit(entry.stashName, repoPath, entry.sha, entry.fileNames, new Date(entry.date * 1000), entry.summary, undefined, entry.fileStatuses, undefined, `${entry.sha}^1`);
                commits.set(entry.sha, commit);
            }
        }
        return {
            repoPath: repoPath,
            commits: commits
        };
    }
    static _parseEntries(data) {
        if (!data)
            return undefined;
        const lines = data.split('\n');
        if (lines.length === 0)
            return undefined;
        const entries = [];
        let entry = undefined;
        let position = -1;
        while (++position < lines.length) {
            let lineParts = lines[position].split(' ');
            if (lineParts.length < 2) {
                continue;
            }
            if (entry === undefined) {
                if (!git_1.Git.shaRegex.test(lineParts[0]))
                    continue;
                entry = {
                    sha: lineParts[0]
                };
                continue;
            }
            switch (lineParts[0]) {
                case 'author-date':
                    entry.date = lineParts[1];
                    break;
                case 'summary':
                    entry.summary = lineParts.slice(1).join(' ').trim();
                    while (++position < lines.length) {
                        const next = lines[position];
                        if (!next)
                            break;
                        if (next === 'filename ?') {
                            position--;
                            break;
                        }
                        entry.summary += `\n${lines[position]}`;
                    }
                    break;
                case 'reflog-selector':
                    entry.stashName = lineParts.slice(1).join(' ').trim();
                    break;
                case 'filename':
                    const nextLine = lines[position + 1];
                    if (nextLine && git_1.Git.shaRegex.test(nextLine)) {
                        entries.push(entry);
                        entry = undefined;
                        continue;
                    }
                    position++;
                    while (++position < lines.length) {
                        const line = lines[position];
                        lineParts = line.split(' ');
                        if (git_1.Git.shaRegex.test(lineParts[0])) {
                            position--;
                            break;
                        }
                        if (entry.fileStatuses == null) {
                            entry.fileStatuses = [];
                        }
                        const status = {
                            status: line[0],
                            fileName: line.substring(1),
                            originalFileName: undefined
                        };
                        this._parseFileName(status);
                        entry.fileStatuses.push(status);
                    }
                    if (entry.fileStatuses) {
                        entry.fileNames = entry.fileStatuses.filter(_ => !!_.fileName).map(_ => _.fileName).join(', ');
                    }
                    entries.push(entry);
                    entry = undefined;
                    break;
                default:
                    break;
            }
        }
        return entries;
    }
    static _parseFileName(entry) {
        if (entry.fileName === undefined)
            return;
        const index = entry.fileName.indexOf('\t') + 1;
        if (index > 0) {
            const next = entry.fileName.indexOf('\t', index) + 1;
            if (next > 0) {
                entry.originalFileName = entry.fileName.substring(index, next - 1);
                entry.fileName = entry.fileName.substring(next);
            }
            else {
                entry.fileName = entry.fileName.substring(index);
            }
        }
    }
}
exports.GitStashParser = GitStashParser;
//# sourceMappingURL=stashParser.js.map