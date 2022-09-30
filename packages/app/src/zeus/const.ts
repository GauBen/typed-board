/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	Mutation:{
		createPost:{

		}
	}
}

export const ReturnTypes: Record<string,any> = {
	Mutation:{
		createPost:"Post"
	},
	Post:{
		body:"String",
		id:"ID",
		title:"String"
	},
	Query:{
		posts:"Post"
	}
}

export const Ops = {
mutation: "Mutation" as const,
	query: "Query" as const
}