import {execSync} from "child_process";

export function isWorktreeClean() {
    try {
        // 'git status --porcelain' returns a string with changes or an empty string if no changes
        const status = execSync('git status --porcelain').toString();
        return status === '';
    } catch (error) {
        console.error('Error checking Git worktree status:', error);
        return false;
    }
}