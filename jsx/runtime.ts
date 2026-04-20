export const Fragment = Symbol("ComponentsJsx.Fragment");

type FunctionComponent = (props: any) => any;

export function jsx(
	type: "br" | typeof Fragment | FunctionComponent,
	props: any,
) {
	switch (type) {
		case "br":
			return "\n";
		case Fragment:
			return props?.children ?? {};
	}
	props ??= {};
	return type(props);
}

export { jsx as jsxs };
