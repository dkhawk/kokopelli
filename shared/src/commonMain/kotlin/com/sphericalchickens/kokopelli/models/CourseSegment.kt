package com.sphericalchickens.kokopelli.models

import kotlinx.serialization.Serializable

@Serializable
data class CourseSegment(
    val id: String,
    val courseId: String,
    val startPoiId: String,
    val endPoiId: String,
    val distanceMeters: Float,
    val gainMeters: Float,
    val lossMeters: Float,
    val quantizedPathGeometry: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false

        other as CourseSegment

        if (id != other.id) return false
        if (courseId != other.courseId) return false
        if (startPoiId != other.startPoiId) return false
        if (endPoiId != other.endPoiId) return false
        if (distanceMeters != other.distanceMeters) return false
        if (gainMeters != other.gainMeters) return false
        if (lossMeters != other.lossMeters) return false
        if (!quantizedPathGeometry.contentEquals(other.quantizedPathGeometry)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + courseId.hashCode()
        result = 31 * result + startPoiId.hashCode()
        result = 31 * result + endPoiId.hashCode()
        result = 31 * result + distanceMeters.hashCode()
        result = 31 * result + gainMeters.hashCode()
        result = 31 * result + lossMeters.hashCode()
        result = 31 * result + quantizedPathGeometry.contentHashCode()
        return result
    }
}
