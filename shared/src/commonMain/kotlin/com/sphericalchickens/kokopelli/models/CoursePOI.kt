package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class CoursePOI(
    val id: String,
    val courseId: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val elevationMeters: Float,
    val sequenceOrder: Int,
    val isBailoutPoint: Boolean = false,
    val bailoutBetaNotes: String? = null
)
