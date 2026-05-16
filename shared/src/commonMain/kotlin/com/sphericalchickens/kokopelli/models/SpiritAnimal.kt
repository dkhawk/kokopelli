package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
enum class SpiritPersona {
    STOIC,
    GRITTY,
    ANALYTICAL
}

@Serializable
data class SpiritAnimal(
    val id: String,
    val athleteProfileId: String,
    val name: String,
    val basePersona: SpiritPersona,
    val customWisdomJson: String = "{}",
    val avatarAssetPath: String? = null
)
