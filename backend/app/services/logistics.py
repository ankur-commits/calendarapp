import random
from typing import Optional, Tuple

class LogisticsService:
    """
    Service to calculate drive times and distances between locations.
    Currently uses a mock implementation. In production, swap with OSRM or Google Maps API.
    """
    
    @staticmethod
    def get_drive_time(origin_coords: str, dest_coords: str) -> int:
        """
        Calculate drive time in minutes between two "lat,long" strings.
        
        Args:
            origin_coords: "lat,long" string
            dest_coords: "lat,long" string
            
        Returns:
            int: Estimated drive time in minutes
        """
        if not origin_coords or not dest_coords:
            return 0
            
        # Mock logic: deterministic hash of strings to get a "random" but stable number
        # Real logic: call Google Routes API
        seed = len(origin_coords) + len(dest_coords)
        random.seed(seed)
        return random.randint(15, 45)
    
    @staticmethod
    def resolve_location(location_query: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Geocodes a location string to lat/long.
        
        Args:
            location_query: e.g. "Lincoln High School"
            
        Returns:
            (latitude, longitude) or (None, None)
        """
        # Mock logic
        if not location_query:
            return None, None
            
        # Simulated coordinates for demo purposes
        return "37.7749", "-122.4194"
