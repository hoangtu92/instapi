/**
 *
 * @param profile_id
 * @returns {{variables: string, doc_id: string}}
 */
function profileQuery(profile_id){
    return {
        "variables": JSON.stringify({
            "enable_integrity_filters": true,
            "id": profile_id,
            "render_surface": "PROFILE",
            "__relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider": true,
            "__relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider": false,
            "__relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider": false
        }),
        "doc_id": "25980296051578533"
    }

}

module.exports = {profileQuery}
