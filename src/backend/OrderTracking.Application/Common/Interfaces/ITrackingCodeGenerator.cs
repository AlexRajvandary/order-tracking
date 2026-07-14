namespace OrderTracking.Application.Common.Interfaces;

public interface ITrackingCodeGenerator
{
    string Generate(int length = 5);
}
