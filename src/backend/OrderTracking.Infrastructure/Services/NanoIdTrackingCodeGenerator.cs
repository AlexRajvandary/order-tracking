using System.Security.Cryptography;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Services;

/// <summary>
/// NanoId-style generator. Alphabet excludes confusing characters 0/O and 1/I.
/// </summary>
public sealed class NanoIdTrackingCodeGenerator : ITrackingCodeGenerator
{
    // 32 chars: digits 2-9, letters without I/O
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    public string Generate(int length = 5)
    {
        if (length is < 1 or > 32)
        {
            throw new ArgumentOutOfRangeException(nameof(length));
        }

        Span<char> buffer = stackalloc char[length];
        Span<byte> bytes = stackalloc byte[length];
        RandomNumberGenerator.Fill(bytes);

        for (var i = 0; i < length; i++)
        {
            buffer[i] = Alphabet[bytes[i] % Alphabet.Length];
        }

        return new string(buffer);
    }
}
