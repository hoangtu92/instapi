/**
 * Cache policy for Instagram GraphQL operations
 * Each policy defines:
 *  - ttl: seconds
 *  - pick: function(response) => cachedValue | null
 */

module.exports = {
    PolarisSearchBoxRefetchableQuery: {
        ttl: 86400*7,
        pick: res =>
            res?.data
                ?.xdt_api__v1__fbsearch__topsearch_connection
                ?.users ?? null,
    },

    PolarisProfilePageContentQuery: {
        ttl: 86400*30, // profile info is relatively stable
        pick: res =>
            res?.data
                ?.user ?? null,
    },

    PolarisProfilePostsQuery: {
        ttl: 300,
        pick: res =>
            res?.data
                ?.xdt_api__v1__feed__user_timeline_graphql_connection ?? null,
    },
    PolarisProfileSimplePostsQuery: {
        ttl: 300,
        pick: res =>
            res?.data
                ?.xdt_api__v1__feed__user_timeline_graphql_connection ?? null,
    },

    PolarisStoriesV3ReelPageStandaloneQuery: {
        ttl: 300, // stories are very volatile
        pick: res =>
            res?.data
                ?.xdt_api__v1__feed__reels_media
                ?.reels_media ?? null,
    },

    PolarisProfileStoryHighlightsTrayContentQuery: {
        ttl: 300,
        pick: res =>
            res?.data
                ?.highlights ?? null,
    },

    PolarisStoriesV3HighlightsPageQuery: {
        ttl: 300,
        pick: res =>
            res?.data
                ?.xdt_api__v1__feed__reels_media__connection
                ?.edges ?? null,
    },

    PolarisProfileReelsTabContentQuery: {
        ttl: 300,
        pick: res =>
            res?.data
                ?.xdt_api__v1__clips__user__connection_v2 ?? null,
    },
};
