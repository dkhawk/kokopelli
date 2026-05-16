package com.sphericalchickens.kokopelli.database

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

object DatabaseFactory {
    fun init(isTest: Boolean = false) {
        val driverClassName = "org.sqlite.JDBC"
        val jdbcURL = if (isTest) {
            "jdbc:sqlite:test.db"
        } else {
            val dbFile = File("kokopelli.db")
            "jdbc:sqlite:${dbFile.absolutePath}"
        }
        val database = Database.connect(jdbcURL, driverClassName)
        
        transaction(database) {
            SchemaUtils.create(UsersTable, AthleteProfilesTable, SpiritAnimalsTable, CoursesTable, CoursePOIsTable, CourseSegmentsTable, ActivityPlansTable, com.sphericalchickens.kokopelli.routes.TelemetrySnapshotsTable)
        }
    }
}

object UsersTable : Table("users") {
    val id = varchar("id", 36)
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = varchar("password_hash", 255).nullable()
    val permissionsMask = integer("permissions_mask")
    val uiStateJson = text("ui_state_json")
    val createdAt = long("created_at")

    override val primaryKey = PrimaryKey(id)
}

object AthleteProfilesTable : Table("athlete_profiles") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).nullable()
    val firstName = varchar("first_name", 255)
    val lastName = varchar("last_name", 255)
    val comfortPaceGradientFlat = float("comfort_pace_gradient_flat")
    val comfortPaceGradientSteep = float("comfort_pace_gradient_steep")
    val iceBloodType = varchar("ice_blood_type", 50).nullable()
    val iceAllergies = text("ice_allergies").nullable()
    val iceMedicalNotes = text("ice_medical_notes").nullable()

    override val primaryKey = PrimaryKey(id)
}

object SpiritAnimalsTable : Table("spirit_animals") {
    val id = varchar("id", 36)
    val athleteProfileId = varchar("athlete_profile_id", 36)
    val name = varchar("name", 255)
    val basePersona = varchar("base_persona", 50)
    val customWisdomJson = text("custom_wisdom_json")
    val avatarAssetPath = text("avatar_asset_path").nullable()

    override val primaryKey = PrimaryKey(id)
}

object CoursesTable : Table("courses") {
    val id = varchar("id", 36)
    val title = varchar("title", 255)
    val totalDistanceMeters = float("total_distance_meters")
    val totalGainMeters = float("total_gain_meters")
    val totalLossMeters = float("total_loss_meters")
    val isPublic = bool("is_public")
    val createdAt = long("created_at")

    override val primaryKey = PrimaryKey(id)
}

object CoursePOIsTable : Table("course_pois") {
    val id = varchar("id", 36)
    val courseId = varchar("course_id", 36)
    val name = varchar("name", 255)
    val latitude = double("latitude")
    val longitude = double("longitude")
    val elevationMeters = float("elevation_meters")
    val sequenceOrder = integer("sequence_order")
    val isBailoutPoint = bool("is_bailout_point")
    val bailoutBetaNotes = text("bailout_beta_notes").nullable()

    override val primaryKey = PrimaryKey(id)
}

object CourseSegmentsTable : Table("course_segments") {
    val id = varchar("id", 36)
    val courseId = varchar("course_id", 36)
    val startPoiId = varchar("start_poi_id", 36)
    val endPoiId = varchar("end_poi_id", 36)
    val distanceMeters = float("distance_meters")
    val gainMeters = float("gain_meters")
    val lossMeters = float("loss_meters")
    val quantizedPathGeometry = blob("quantized_path_geometry")

    override val primaryKey = PrimaryKey(id)
}

object ActivityPlansTable : Table("activity_plans") {
    val id = varchar("id", 36)
    val athleteProfileId = varchar("athlete_profile_id", 36)
    val courseId = varchar("course_id", 36)
    val spiritAnimalId = varchar("spirit_animal_id", 36)
    val scheduledStartTime = long("scheduled_start_time")
    val fitnessCalibrationModifier = float("fitness_calibration_modifier")
    val uniqueShareToken = varchar("unique_share_token", 255)
    val morningPrepJson = text("morning_prep_json")
    val status = varchar("status", 50)

    override val primaryKey = PrimaryKey(id)
}
