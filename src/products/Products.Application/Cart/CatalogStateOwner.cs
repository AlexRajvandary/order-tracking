namespace Products.Application.Cart
{
    public readonly record struct CatalogStateOwner
    {
        private const string InvalidUserIdMessage = "Invalid user ID.";
        private static readonly System.Text.RegularExpressions.Regex VisitorKeyPattern = new("^[A-Za-z0-9_-]{1,64}$", System.Text.RegularExpressions.RegexOptions.Compiled | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

        public Guid? UserId { get; }

        public string? VisitorKey { get; }

        private CatalogStateOwner(Guid? userId, string? visitorKey)
        {
            UserId = userId;
            VisitorKey = visitorKey;
        }

        public static CatalogStateOwner ForUser(Guid userId)
        {
            if (userId == Guid.Empty)
            {
                throw new ArgumentException(InvalidUserIdMessage);
            }

            return new CatalogStateOwner(userId, null);
        }

        public static CatalogStateOwner ForVisitor(string visitorKey)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(visitorKey);
            visitorKey = visitorKey.Trim();
            if (!IsValidVisitorKey(visitorKey))
            {
                throw new ArgumentException("Invalid visitor key.", nameof(visitorKey));
            }
            return new CatalogStateOwner(null, visitorKey);
        }

        public static bool IsValidVisitorKey(string? visitorKey) =>
            visitorKey is not null && VisitorKeyPattern.IsMatch(visitorKey);
    }
}
