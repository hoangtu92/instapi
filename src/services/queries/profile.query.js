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
            "__relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider": true,
            "__relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider": false,
            "__relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider": false,
            "__relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider": false,
            "__relay_internal__pv__PolarisShortDramaEnabledrelayprovider":false,
            "__relay_internal__pv__PolarisLongformEnabledrelayprovider":false
        }),
        "doc_id": "38611279431804694"
    }

}

module.exports = {profileQuery}
