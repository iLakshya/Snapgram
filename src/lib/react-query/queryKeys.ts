// to connect one key with one string

export enum QUERY_KEYS {

    // Auth Key
    CREATE_USER_ACCOUNT = "createUserAccount",

    // User Key
    GET_CURRENT_USER = "getCurrentUser",
    GET_USERS = "getUsers",
    GET_USER_BY_ID = "getUserById",

    // Post Keys
    GET_POSTS = "getPosts",
    GET_INFINITE_POSTS = "getInfinitePosts",
    GET_RECENT_POSTS = "getRecentPosts",
    GET_POST_BY_ID = "getPostById",
    GET_USER_POSTS = "getUserPosts",
    GET_FILE_PREVIEW = "getFilePreview",

    // Search Keys
    SEARCH_POSTS = "getSearchPosts",
}