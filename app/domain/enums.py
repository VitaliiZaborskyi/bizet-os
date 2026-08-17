from enum import Enum


class ObjectType(str, Enum):
    NEW_BUILD = "NEW_BUILD"
    OLD_STOCK = "OLD_STOCK"
    PRIVATE_HOUSE = "PRIVATE_HOUSE"
    COMMERCIAL_PLACEHOLDER = "COMMERCIAL_PLACEHOLDER"


class Configuration(str, Enum):
    LEFT_WALL = "LEFT_WALL"      # wall on left, open on right
    RIGHT_WALL = "RIGHT_WALL"    # open on left, wall on right
    BETWEEN_WALLS = "BETWEEN_WALLS"


class OpeningSystem(str, Enum):
    HANDLE = "HANDLE"
    PUSH = "PUSH"
    GOLA = "GOLA"


class CeilingType(str, Enum):
    STRETCH_A = "STRETCH_A"
    STRETCH_B = "STRETCH_B"
    GYPSUM = "GYPSUM"
    OPEN_GAP = "OPEN_GAP"


class ConfidenceSource(str, Enum):
    SCAN_DETECTED = "SCAN_DETECTED"
    USER_ENTERED = "USER_ENTERED"
    USER_CONFIRMED = "USER_CONFIRMED"
    ESTIMATED = "ESTIMATED"


class ApplianceType(str, Enum):
    FRIDGE_BUILTIN = "FRIDGE_BUILTIN"
    FRIDGE_FREESTANDING = "FRIDGE_FREESTANDING"
    FREEZER = "FREEZER"
    SINK = "SINK"
    DISHWASHER = "DISHWASHER"
    COOKTOP = "COOKTOP"
    OVEN = "OVEN"
    MICROWAVE = "MICROWAVE"
    HOOD_FREESTANDING = "HOOD_FREESTANDING"
    HOOD_BUILTIN = "HOOD_BUILTIN"
    WASTE_DISPOSER = "WASTE_DISPOSER"


class ModuleKind(str, Enum):
    TALL = "TALL"
    APPLIANCE = "APPLIANCE"
    HINGED = "HINGED"
    DRAWERS = "DRAWERS"
    FUNCTIONAL = "FUNCTIONAL"
    FILLER = "FILLER"


class ValidationStatus(str, Enum):
    VALID = "VALID"
    VALID_WITH_WARNINGS = "VALID_WITH_WARNINGS"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    STOP = "STOP"


class EngineResultType(str, Enum):
    HARD_RULE = "HARD_RULE"
    DEFAULT_RULE = "DEFAULT_RULE"
    RECOMMENDATION = "RECOMMENDATION"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    USER_CHOICE_REQUIRED = "USER_CHOICE_REQUIRED"
    WARNING = "WARNING"
    STOP = "STOP"
    HUMAN_REVIEW = "HUMAN_REVIEW"


class SinkMountType(str, Enum):
    TOP_MOUNT = "TOP_MOUNT"
    UNDERMOUNT = "UNDERMOUNT"
    FLUSH = "FLUSH"
    UNKNOWN = "UNKNOWN"


class CooktopEnergyType(str, Enum):
    ELECTRIC = "ELECTRIC"
    INDUCTION = "INDUCTION"
    GAS = "GAS"
    COMBINED = "COMBINED"
    UNKNOWN = "UNKNOWN"


class AppliancePlacement(str, Enum):
    AUTO = "AUTO"
    UNDER_COOKTOP = "UNDER_COOKTOP"
    TALL_UNIT = "TALL_UNIT"
