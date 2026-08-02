export interface CodebergBlobRef {
	owner: string;
	repo: string;
	refKind: "branch" | "commit";
	ref: string;
	path: string;
	startLine?: number;
	endLine?: number;
}
