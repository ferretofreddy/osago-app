/**
 * Genera URLs de navegación para Google Maps y Waze
 */
export function googleMapsDirections(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function googleMapsEmbed(lat: number, lng: number, zoom = 14): string {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function wazeNavigation(lat: number, lng: number): string {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function googleCalendarEvent(
    title: string,
    date: string,        // 'YYYY-MM-DD'
    startTime: string,   // 'HH:MM'
    endTime: string,     // 'HH:MM'
    location?: string
): string {
    const [y, m, d] = date.split('-');
    const start = `${y}${m}${d}T${startTime.replace(':', '')}00`;
    const end   = `${y}${m}${d}T${endTime.replace(':', '')}00`;
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${start}/${end}`,
        ...(location ? { location } : {}),
    });
    return `https://calendar.google.com/calendar/render?${params}`;
}
