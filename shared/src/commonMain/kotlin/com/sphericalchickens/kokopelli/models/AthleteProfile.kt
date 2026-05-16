package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class AthleteProfile(
    val id: String,
    val userId: String? = null,
    val firstName: String,
    val lastName: String,
    val comfortPaceGradientFlat: Float,
    val comfortPaceGradientSteep: Float,
    val iceBloodType: String? = null,
    val iceAllergies: String? = null,
    val iceMedicalNotes: String? = null
)
